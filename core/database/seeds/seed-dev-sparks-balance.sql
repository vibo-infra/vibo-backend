-- Dev / admin: set Sparks balance on specific users (local or staging).
-- Safe to run once via `npm run seed`. To re-apply after edits:
--   DELETE FROM seeds WHERE name = 'seed-dev-sparks-balance.sql';
--   npm run seed
--
-- Sparks live on `users.spark_balance` (INTEGER, NOT NULL, default 0).
-- Add more emails to the IN (...) list as needed.

BEGIN;

UPDATE users
SET
  spark_balance = 10000,
  updated_at = NOW()
WHERE email IN (
  'seeds.host@vibo.local'
);

COMMIT;
