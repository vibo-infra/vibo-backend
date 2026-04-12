-- Referral codes, invite rewards, home section preferences (mobile MVP).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16),
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS app_preferences JSONB NOT NULL DEFAULT '{"showUpcomingOnHome":true,"showHappeningSoonOnHome":true}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique
  ON users (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_bonus_granted (
  invitee_user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE referral_bonus_granted IS 'One row per invitee — referrer gets Sparks once when invitee registers with a valid code.';
COMMENT ON COLUMN users.app_preferences IS 'Client UI flags, e.g. showUpcomingOnHome, showHappeningSoonOnHome';
