-- Migration: add_refresh_token_to_session
-- Created at: 2026-03-22T11:31:30.676Z

ALTER TABLE session
  ADD COLUMN refresh_token       TEXT UNIQUE,
  ADD COLUMN refresh_token_expires_at TIMESTAMPTZ;

CREATE INDEX idx_session_refresh_token ON session(refresh_token);