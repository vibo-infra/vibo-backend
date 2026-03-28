-- Migration: create_users_table
-- Created at: 2026-03-22T11:02:30.054Z

CREATE TABLE users (
  user_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        NOT NULL UNIQUE,
  phone             TEXT        UNIQUE,
  hashed_password   TEXT        NOT NULL,
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  banned_at         TIMESTAMPTZ,
  ban_reason        TEXT,
  device_fingerprint TEXT,
  accepted_tos_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);