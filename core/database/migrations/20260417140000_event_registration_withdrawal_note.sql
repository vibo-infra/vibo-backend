-- Optional message when an attendee releases their spot
ALTER TABLE event_registration
  ADD COLUMN IF NOT EXISTS withdrawal_note TEXT;
