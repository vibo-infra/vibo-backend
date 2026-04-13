-- Saved / liked events per user (for app heart UI)

CREATE TABLE IF NOT EXISTS event_like (
  event_id UUID NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_like_user ON event_like(user_id);
