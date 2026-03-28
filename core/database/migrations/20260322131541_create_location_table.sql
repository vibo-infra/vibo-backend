-- Migration: create_location_table
-- Created at: 2026-03-22T13:15:42.030Z

CREATE TABLE location (
  location_id  UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  address      TEXT,
  city         TEXT,
  state        TEXT,
  country      TEXT,
  pincode      TEXT,
  latitude     NUMERIC(9,6) NOT NULL,
  longitude    NUMERIC(9,6) NOT NULL,
  geo_hash     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for geo queries — you'll query by lat/lng often
CREATE INDEX idx_location_lat_lng ON location(latitude, longitude);