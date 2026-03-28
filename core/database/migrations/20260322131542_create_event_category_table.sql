-- Migration: create_event_category_table
-- Created at: 2026-03-22T13:15:42.445Z

CREATE TABLE event_category (
  category_id   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT    NOT NULL UNIQUE,
  icon_url      TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories right here — this data must exist in prod too
INSERT INTO event_category (name, display_order) VALUES
  ('Music',      1),
  ('Sports',     2),
  ('Food',       3),
  ('Networking', 4),
  ('Art',        5),
  ('Tech',       6)
ON CONFLICT (name) DO NOTHING;