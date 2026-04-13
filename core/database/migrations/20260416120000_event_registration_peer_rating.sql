-- Attendee registrations (join) + optional peer rating on reviews

CREATE TABLE IF NOT EXISTS event_registration (
  event_id UUID NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status   TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registration_user
  ON event_registration (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_registration_event
  ON event_registration (event_id);

ALTER TABLE attendee_review
  ADD COLUMN IF NOT EXISTS peer_rating SMALLINT
  CHECK (peer_rating IS NULL OR (peer_rating >= 1 AND peer_rating <= 5));
