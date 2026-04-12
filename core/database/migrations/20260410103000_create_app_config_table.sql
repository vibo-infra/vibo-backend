-- Runtime configuration (replace hardcoded costs / launch gates).

CREATE TABLE IF NOT EXISTS app_config (
  config_key TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_config IS 'Product flags and numeric settings; JSONB value per key.';

-- Migrate legacy rows if present
INSERT INTO app_config (config_key, value, updated_at)
SELECT config_key, value, updated_at
FROM app_feature_config
ON CONFLICT (config_key) DO NOTHING;

-- Defaults (no-op if key exists)
INSERT INTO app_config (config_key, value) VALUES
  ('product_launch_at', 'null'::jsonb),
  ('early_access_cutoff_at', 'null'::jsonb),
  ('paid_event_host_spark_cost', '30'::jsonb),
  ('waitlist_spark_grant_amount', '1000'::jsonb),
  ('hosting_requires_verification_mvp', 'false'::jsonb),
  ('global_unlimited_hosting_until', 'null'::jsonb),
  ('hosting_promo_registration_end', 'null'::jsonb),
  ('hosting_promo_unlimited_end', 'null'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
