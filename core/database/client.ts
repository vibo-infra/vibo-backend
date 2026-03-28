
// single shared connection pool your entire app uses

import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.POSTGRES_SUPABASE_DB_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});