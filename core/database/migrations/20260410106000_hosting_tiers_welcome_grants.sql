-- Welcome hosting quotas, waitlist tiers, optional identity gate (future).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS regular_login_spark_grant_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waitlist_tier TEXT,
  ADD COLUMN IF NOT EXISTS waitlist_hosting_discount_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS spark_welcome_paid_hostings_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN users.regular_login_spark_grant_at IS 'One-time Sparks for users who are not on the waitlist (or ineligible for waitlist bundle).';
COMMENT ON COLUMN users.waitlist_tier IS 'tier1 = first N signups by position; tier2 = remaining waitlist; set when bundle applied.';
COMMENT ON COLUMN users.waitlist_hosting_discount_until IS 'tier1 only: discounted paid-hosting spark cost until this instant.';
COMMENT ON COLUMN users.spark_welcome_paid_hostings_used IS 'How many paid listings used the welcome spark waiver (not tier1 discounted paid).';
COMMENT ON COLUMN users.identity_verified_at IS 'Future: government-ID or equivalent; NULL = not verified.';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_waitlist_tier_check;
ALTER TABLE users ADD CONSTRAINT users_waitlist_tier_check
  CHECK (waitlist_tier IS NULL OR waitlist_tier IN ('tier1', 'tier2'));

-- Config defaults (see docs/HOSTING_AND_WELCOME_GRANTS.md)
INSERT INTO app_config (config_key, value) VALUES
  ('regular_first_login_spark_grant', '30'::jsonb),
  ('welcome_free_paid_hostings_count', '3'::jsonb),
  ('waitlist_tier1_max_position', '100'::jsonb),
  ('waitlist_tier1_spark_grant_total', '1030'::jsonb),
  ('waitlist_tier2_spark_grant_total', '530'::jsonb),
  ('waitlist_tier1_hosting_spark_cost', '20'::jsonb),
  ('waitlist_tier1_discount_months', '6'::jsonb),
  ('waitlist_benefits_require_signup_before_account', 'true'::jsonb),
  ('hosting_requires_identity_verification', 'false'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
