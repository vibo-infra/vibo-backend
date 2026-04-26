-- Follow-up for databases that already ran the platform attribution migration
-- before session.source was added to it.

ALTER TABLE session
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ios';

DO $$
BEGIN
  ALTER TABLE session
    ADD CONSTRAINT session_source_check
    CHECK (source IN ('ios', 'android', 'web'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_source
  ON session (source);
