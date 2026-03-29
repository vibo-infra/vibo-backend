-- Migration: create_analytics_events
-- Created at: 2026-03-29T17:39:52.462Z

CREATE TABLE analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT 'web',
  event_type   TEXT        NOT NULL,
  element      TEXT,
  page         TEXT,
  entity_type  TEXT,
  entity_id    UUID,
  user_id      UUID,
  utm_source   TEXT,
  utm_campaign TEXT,
  city         TEXT,
  metadata     JSONB,
  client_ts    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aevents_session  ON analytics_events(session_id);
CREATE INDEX idx_aevents_type     ON analytics_events(event_type);
CREATE INDEX idx_aevents_source   ON analytics_events(source);
CREATE INDEX idx_aevents_created  ON analytics_events(created_at);
CREATE INDEX idx_aevents_user     ON analytics_events(user_id);