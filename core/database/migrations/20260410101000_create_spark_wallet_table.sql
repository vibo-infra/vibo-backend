-- Sparks balance: single source of truth per user (users.spark_balance kept in sync by app).

CREATE TABLE IF NOT EXISTS spark_wallet (
  user_id    UUID        PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  balance    BIGINT      NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spark_wallet_updated ON spark_wallet (updated_at DESC);

-- Backfill from legacy column
INSERT INTO spark_wallet (user_id, balance)
SELECT u.user_id, GREATEST(u.spark_balance::bigint, 0)
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM spark_wallet w WHERE w.user_id = u.user_id);

COMMENT ON TABLE spark_wallet IS 'Credit balance (Sparks) per user; mutations go through spark_transaction.';
