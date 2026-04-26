-- Attribute key MVP actions to the platform where they started.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_source TEXT NOT NULL DEFAULT 'ios'
  CHECK (signup_source IN ('ios', 'android', 'web'));

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ios'
  CHECK (source IN ('ios', 'android', 'web'));

ALTER TABLE event_registration
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ios'
  CHECK (source IN ('ios', 'android', 'web'));

ALTER TABLE session
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ios'
  CHECK (source IN ('ios', 'android', 'web'));

CREATE INDEX IF NOT EXISTS idx_users_signup_source
  ON users (signup_source);

CREATE INDEX IF NOT EXISTS idx_event_source
  ON event (source);

CREATE INDEX IF NOT EXISTS idx_event_registration_source
  ON event_registration (source);

CREATE INDEX IF NOT EXISTS idx_session_source
  ON session (source);
