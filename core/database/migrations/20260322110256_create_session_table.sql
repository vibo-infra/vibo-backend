-- Migration: create_session_table
-- Created at: 2026-03-22T11:02:56.304Z

CREATE TABLE session (
  session_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  device_info TEXT,
  ip_address  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_token   ON session(token);