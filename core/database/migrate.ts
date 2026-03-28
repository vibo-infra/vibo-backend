import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.POSTGRES_SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
  connectionTimeoutMillis: 5000,
});

const MIGRATIONS_TABLE = '_migrations';
const LOCK_ID = 123456; // arbitrary constant for advisory lock
const DRY_RUN = process.env.DRY_RUN === 'true';

async function runMigrations() {
  const client = await pool.connect();

  try {
    // 🔒 Prevent concurrent migration runs
    await client.query(`SELECT pg_advisory_lock(${LOCK_ID})`);

    // 🧱 Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations folder not found: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📦 Found ${files.length} migration(s)\n`);

    for (const file of files) {
      const { rows } = await client.query(
        `SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE filename = $1`,
        [file]
      );

      if (rows.length > 0) {
        console.log(`⏭  Skipping (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`🚀 Applying: ${file}`);

      await client.query('BEGIN');

      try {
        if (!DRY_RUN) {
          await client.query(sql);
        } else {
          console.log(`🧪 DRY RUN: ${file} not executed`);
        }

        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
          [file]
        );

        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}\n`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed migration: ${file}`);
        console.error(`Error: ${err.message}\n`);
        process.exit(1);
      }
    }

    console.log('🎉 All migrations complete.');
  } catch (err: any) {
    console.error('❌ Migration runner failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    try {
      await client.query(`SELECT pg_advisory_unlock(${LOCK_ID})`);
    } catch (e) {
      console.warn('⚠️ Failed to release advisory lock');
    }

    client.release();
    await pool.end();
  }
}

runMigrations();