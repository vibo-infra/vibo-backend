-- Append-only audit of every spark balance change.

CREATE TABLE IF NOT EXISTS spark_transaction (
  transaction_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount         BIGINT      NOT NULL,
  balance_after  BIGINT      NOT NULL CHECK (balance_after >= 0),
  reason         TEXT        NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spark_tx_user_created ON spark_transaction (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spark_tx_reference ON spark_transaction (reference_type, reference_id);

COMMENT ON TABLE spark_transaction IS 'Audit trail: amount is signed delta (+ credit, − debit).';
COMMENT ON COLUMN spark_transaction.reason IS 'e.g. waitlist_grant, paid_event_hosting, admin_adjustment';
