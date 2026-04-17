/** Attendee / interest nudges (separate dedupe from host `event_reminder_push_sent`). */

export const LIST_EVENTS_IN_ATTENDEE_START_WINDOW = `
  SELECT e.event_id, e.event_name, e.start_time, e.host_id
  FROM event e
  WHERE e.status = 'published'
    AND e.start_time > NOW()
    AND e.start_time BETWEEN
      NOW() + (($1::numeric) * INTERVAL '1 hour') - (($2::numeric) * INTERVAL '1 minute')
      AND NOW() + (($1::numeric) * INTERVAL '1 hour') + (($2::numeric) * INTERVAL '1 minute')
    AND (
      EXISTS (SELECT 1 FROM event_like el WHERE el.event_id = e.event_id)
      OR EXISTS (
        SELECT 1 FROM event_registration er
        WHERE er.event_id = e.event_id AND er.status = 'registered'
      )
    )
`;

/** ~1h after effective end (end_time or start+2h). */
export const LIST_EVENTS_FOR_POST_END_ATTENDEE_PUSH = `
  SELECT e.event_id, e.event_name, e.host_id
  FROM event e
  WHERE e.status = 'published'
    AND COALESCE(e.end_time, e.start_time + INTERVAL '2 hours') + INTERVAL '1 hour'
      BETWEEN NOW() - (($1::numeric) * INTERVAL '1 minute')
          AND NOW() + (($1::numeric) * INTERVAL '1 minute')
`;
