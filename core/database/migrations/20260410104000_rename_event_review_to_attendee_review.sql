-- Align table name with domain language (attendee reviews).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_review'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'attendee_review'
  ) THEN
    ALTER TABLE event_review RENAME TO attendee_review;
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_event_review_event RENAME TO idx_attendee_review_event;
