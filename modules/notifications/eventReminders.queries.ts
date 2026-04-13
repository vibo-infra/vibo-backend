/** Events starting in ~`hoursFromNow` hours, not yet reminded with `kind`. */
export const LIST_EVENTS_FOR_START_REMINDER = `
  SELECT e.event_id, e.host_id, e.event_name, e.start_time
  FROM event e
  WHERE e.status = 'published'
    AND e.start_time > NOW()
    AND e.start_time BETWEEN
      NOW() + (($1::numeric) * INTERVAL '1 hour') - (($2::numeric) * INTERVAL '1 minute')
      AND NOW() + (($1::numeric) * INTERVAL '1 hour') + (($2::numeric) * INTERVAL '1 minute')
    AND NOT EXISTS (
      SELECT 1 FROM event_reminder_push_sent s
      WHERE s.event_id = e.event_id AND s.reminder_kind = $3
    )
`;

export const INSERT_EVENT_REMINDER_SENT = `
  INSERT INTO event_reminder_push_sent (event_id, reminder_kind)
  VALUES ($1, $2)
  ON CONFLICT (event_id, reminder_kind) DO NOTHING
`;
