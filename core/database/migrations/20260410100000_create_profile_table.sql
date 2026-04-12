-- Canonical profile table (idempotent — may already exist from earlier migrations).
-- Stores display fields; preferences stay on users.

CREATE TABLE IF NOT EXISTS profile (
  user_id    UUID        PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  first_name TEXT        NOT NULL DEFAULT '',
  last_name  TEXT,
  avatar_url TEXT,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_updated_at ON profile (updated_at DESC);

COMMENT ON TABLE profile IS 'User-facing profile row; one per user; created at registration.';
