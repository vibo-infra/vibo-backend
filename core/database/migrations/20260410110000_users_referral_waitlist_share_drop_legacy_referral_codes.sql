-- Ensure mobile auth columns exist (fixes "column u.referral_code does not exist" if 20260410107000 never ran or failed).
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_preferences JSONB NOT NULL DEFAULT '{"showUpcomingOnHome":true,"showHappeningSoonOnHome":true}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique
  ON users (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_bonus_granted (
  invitee_user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Web waitlist: single column for share link code (replaces legacy `referral_codes` table).
ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS referral_share_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_referral_share_code_unique
  ON waitlist_signups (referral_share_code)
  WHERE referral_share_code IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referral_codes'
  ) THEN
    UPDATE waitlist_signups ws
    SET referral_share_code = rc.code
    FROM referral_codes rc
    WHERE rc.owner_id = ws.id
      AND ws.referral_share_code IS NULL;
  END IF;
END $$;

DROP TABLE IF EXISTS referral_codes;
