-- Hyperlocal UX: user last geo (nearby new-event pushes), event ease tags, check-ins,
-- attendee reminder dedupe, interest broadcast throttle.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_known_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_known_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_known_geo_at TIMESTAMPTZ;

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS ease_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS interest_last_broadcast_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS event_checkin (
  event_id UUID NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkin_event ON event_checkin (event_id);

CREATE TABLE IF NOT EXISTS event_attendee_push_sent (
  event_id UUID NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('t24h', 't1h', 't_post1h')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_event_attendee_push_sent_kind ON event_attendee_push_sent (kind, sent_at);

INSERT INTO app_config (config_key, value, updated_at)
VALUES (
  'push_interest_momentum_lines',
  '["Two more people are circling this one.","This hang is picking up — peek again?","Someone tapped in; the maybe-pile grew.","Plot twist: more locals are flirting with showing up.","Whispers on the wire: interest ticked up.","Fresh curiosity on this invite — worth another look.","The vibe stack just got taller — {n} interested now."]'::jsonb,
  NOW()
)
ON CONFLICT (config_key) DO NOTHING;
