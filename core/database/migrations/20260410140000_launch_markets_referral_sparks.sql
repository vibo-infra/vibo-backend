-- Cities where the product is fully live (events, etc.). Others see waitlist CTA on Home.
INSERT INTO app_config (config_key, value, updated_at)
VALUES
  ('launch_live_cities', '["Mumbai"]'::jsonb, NOW()),
  ('city_waitlist_launch_goal', '100'::jsonb, NOW()),
  ('referral_invite_sparks', '20'::jsonb, NOW())
ON CONFLICT (config_key) DO NOTHING;
