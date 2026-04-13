import { pool } from '../../core/database/client';
import {
  LIST_EVENTS_FOR_START_REMINDER,
  INSERT_EVENT_REMINDER_SENT,
} from './eventReminders.queries';

export type EventReminderKind = 't24h' | 't1h';

export type EventReminderRow = {
  event_id: string;
  host_id: string;
  event_name: string;
  start_time: Date;
};

export const listEventsForStartReminder = async (
  hoursFromNow: number,
  windowMinutes: number,
  kind: EventReminderKind
): Promise<EventReminderRow[]> => {
  const { rows } = await pool.query(LIST_EVENTS_FOR_START_REMINDER, [
    hoursFromNow,
    windowMinutes,
    kind,
  ]);
  return rows as EventReminderRow[];
};

export const markReminderSent = async (eventId: string, kind: EventReminderKind) => {
  await pool.query(INSERT_EVENT_REMINDER_SENT, [eventId, kind]);
};
