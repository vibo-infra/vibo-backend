-- Dedupe host reminder pushes (24h / 1h before start) for scheduled job sweeps.

CREATE TABLE IF NOT EXISTS event_reminder_push_sent (
  event_id UUID NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
  reminder_kind TEXT NOT NULL CHECK (reminder_kind IN ('t24h', 't1h')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, reminder_kind)
);

CREATE INDEX IF NOT EXISTS idx_event_reminder_push_sent_sent_at
  ON event_reminder_push_sent (sent_at);
