-- Migration: create_event_table
-- Created at: 2026-03-22T13:15:42.838Z

CREATE TABLE event (
  event_id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id                  UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id              UUID        REFERENCES event_category(category_id) ON DELETE SET NULL,
  location_id              UUID        REFERENCES location(location_id) ON DELETE SET NULL,
  event_name               TEXT        NOT NULL,
  event_description        TEXT,
  cover_image_url          TEXT,
  start_time               TIMESTAMPTZ NOT NULL,
  end_time                 TIMESTAMPTZ,
  capacity                 INTEGER,
  current_attendee_count   INTEGER     NOT NULL DEFAULT 0,
  minimum_attendees        INTEGER,
  confirmation_deadline    TIMESTAMPTZ,
  is_free                  BOOLEAN     NOT NULL DEFAULT TRUE,
  price                    NUMERIC(10,2),
  requires_approval        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_private               BOOLEAN     NOT NULL DEFAULT FALSE,
  requires_verified_attendees BOOLEAN  NOT NULL DEFAULT FALSE,
  audience_type            TEXT        NOT NULL DEFAULT 'everyone',
  status                   TEXT        NOT NULL DEFAULT 'draft',
  cancellation_reason      TEXT,
  event_rating             NUMERIC(3,2),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_host_id     ON event(host_id);
CREATE INDEX idx_event_category_id ON event(category_id);
CREATE INDEX idx_event_location_id ON event(location_id);
CREATE INDEX idx_event_status      ON event(status);
CREATE INDEX idx_event_start_time  ON event(start_time);