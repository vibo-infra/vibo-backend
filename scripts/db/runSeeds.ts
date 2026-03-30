import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_SUPABASE_DB_URL,
});

const seedsDir = path.join(process.cwd(), "core/database/seeds");

async function runSeeds() {
  const client = await pool.connect();

  try {
    const res = await client.query("SELECT name FROM seeds");
    const executed = new Set(res.rows.map((r) => r.name));

    const files = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`⏭ Skipping ${file}`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(seedsDir, file),
        "utf-8"
      );

      console.log(`🚀 Running ${file}`);

      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO seeds (name) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");

      console.log(`✅ Done ${file}`);
    }

    console.log("🌱 All seeds done");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSeeds();