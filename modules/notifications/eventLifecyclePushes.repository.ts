import { pool } from '../../core/database/client';
import {
  LIST_EVENTS_IN_ATTENDEE_START_WINDOW,
  LIST_EVENTS_FOR_POST_END_ATTENDEE_PUSH,
} from './eventLifecyclePushes.queries';

export type LifecycleEventRow = {
  event_id: string;
  event_name: string;
  start_time: Date;
  host_id: string;
};

export const listEventsInAttendeeStartWindow = async (
  hoursFromNow: number,
  windowMinutes: number
): Promise<LifecycleEventRow[]> => {
  const { rows } = await pool.query(LIST_EVENTS_IN_ATTENDEE_START_WINDOW, [hoursFromNow, windowMinutes]);
  return rows as LifecycleEventRow[];
};

export const listEventsForPostEndAttendeePush = async (windowMinutes: number): Promise<LifecycleEventRow[]> => {
  const { rows } = await pool.query(LIST_EVENTS_FOR_POST_END_ATTENDEE_PUSH, [windowMinutes]);
  return rows as LifecycleEventRow[];
};
