-- Profile (required by event list JOINs), sparks, hosting promo fields, notifications, reviews, extra categories

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spark_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_city TEXT,
  ADD COLUMN IF NOT EXISTS unlimited_hosting_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waitlist_spark_bonus_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS in_app_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS profile (
  user_id    UUID        PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  first_name TEXT        NOT NULL DEFAULT '',
  last_name  TEXT,
  avatar_url TEXT,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO profile (user_id, first_name)
SELECT
  u.user_id,
  COALESCE(NULLIF(trim(split_part(u.email, '@', 1)), ''), 'Guest')
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM profile p WHERE p.user_id = u.user_id);

CREATE TABLE IF NOT EXISTS app_feature_config (
  config_key TEXT PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_feature_config IS 'Key/value feature flags and promo windows; readable by backend services for extensible behavior.';

CREATE TABLE IF NOT EXISTS notification (
  notification_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  data            JSONB,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_user_created
  ON notification (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_push_token (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_token_user ON user_push_token (user_id);

CREATE TABLE IF NOT EXISTS event_review (
  review_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
  reviewer_id UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating      SMALLINT    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_event_review_event ON event_review (event_id);

INSERT INTO event_category (name, display_order) VALUES
  ('Outdoors',   10),
  ('Creative',   11),
  ('Social',     12),
  ('Wellness',   13),
  ('Learning',   14),
  ('Other',      99)
ON CONFLICT (name) DO NOTHING;
