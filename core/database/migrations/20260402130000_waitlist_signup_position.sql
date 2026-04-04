-- Immutable # shown at join — matches UI + emails (all signups, ignores converted for rank)

ALTER TABLE waitlist_signups
  ADD COLUMN IF NOT EXISTS signup_position INT;

-- Backfill: chronological join order among all rows (same as historical COUNT-at-join)
UPDATE waitlist_signups ws
SET signup_position = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)::int AS rn
  FROM waitlist_signups
) sub
WHERE ws.id = sub.id
  AND ws.signup_position IS NULL;

ALTER TABLE waitlist_signups
  ALTER COLUMN signup_position SET NOT NULL;

CREATE OR REPLACE FUNCTION trg_waitlist_set_signup_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Count existing rows before this insert; +1 = same as UI total after join
  NEW.signup_position := (SELECT COALESCE(COUNT(*)::int, 0) + 1 FROM waitlist_signups);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waitlist_signup_position_bi ON waitlist_signups;
CREATE TRIGGER waitlist_signup_position_bi
  BEFORE INSERT ON waitlist_signups
  FOR EACH ROW
  EXECUTE PROCEDURE trg_waitlist_set_signup_position();
