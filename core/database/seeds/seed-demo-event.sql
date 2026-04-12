-- One published demo event for local dev (nearby/map APIs). Runs with `npm run seed`.
--
-- Edit the VALUES below to change copy, time, or coords. Uses `Music` category from migrations.
-- Seed host password (local only): vibo-seed-local
--
-- To apply again after changing this file: delete the row for this filename from table `seeds`, then `npm run seed`.

BEGIN;

INSERT INTO users (email, hashed_password, is_verified, is_active)
VALUES (
  'seeds.host@vibo.local',
  '$2b$10$bLKJfrq7pbi5zGr25Rj5eOibqvDT.Tktpgu8K/bLNzl/IPeNnLn3e',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

WITH ready AS (
  SELECT
    u.user_id AS host_id,
    c.category_id
  FROM users u
  CROSS JOIN event_category c
  WHERE u.email = 'seeds.host@vibo.local'
    AND c.name = 'Music'
    AND c.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM event e WHERE e.host_id = u.user_id
    )
),
loc AS (
  INSERT INTO location (address, city, state, country, pincode, latitude, longitude)
  SELECT
    'SGNP main gate, Borivali East',
    'Mumbai',
    'Maharashtra',
    'IN',
    NULL,
    19.2236::numeric,
    72.8841::numeric
  FROM ready
  RETURNING location_id
)
INSERT INTO event (
  host_id,
  category_id,
  location_id,
  event_name,
  event_description,
  start_time,
  end_time,
  capacity,
  is_free,
  price,
  requires_approval,
  is_private,
  audience_type,
  status
)
SELECT
  r.host_id,
  r.category_id,
  l.location_id,
  'Sunrise hike — Sanjay Gandhi National Park',
  'Easy trail near Borivali — demo listing for MVP.',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days' + INTERVAL '3 hours',
  20,
  TRUE,
  NULL,
  FALSE,
  FALSE,
  'everyone',
  'published'
FROM ready r
CROSS JOIN loc l;

COMMIT;
