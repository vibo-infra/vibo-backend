import * as notificationsService from './notifications.service';
import { PushPayloadType } from './pushPayload';
import * as eventRemindersRepository from './eventReminders.repository';

/** Match cron every ~10–15 min without double-sending. */
const WINDOW_MINUTES = 12;

async function sweepKind(kind: eventRemindersRepository.EventReminderKind, hoursFromNow: number) {
  const rows = await eventRemindersRepository.listEventsForStartReminder(
    hoursFromNow,
    WINDOW_MINUTES,
    kind
  );
  for (const row of rows) {
    try {
      await notificationsService.createInAppNotification({
        userId: row.host_id,
        title: 'Upcoming event',
        body: `"${row.event_name}" starts ${kind === 't24h' ? 'in 24 hours' : 'in 1 hour'}.`,
        data: {
          type: PushPayloadType.eventReminder,
          eventId: row.event_id,
          reminder: kind,
        },
      });
      await eventRemindersRepository.markReminderSent(row.event_id, kind);
    } catch (e) {
      console.error('[event-reminders] failed', row.event_id, kind, e);
    }
  }
  return rows.length;
}

/** Call from an internal cron HTTP handler (e.g. every 10–15 minutes). */
export const runEventHostStartReminders = async (): Promise<{ t24h: number; t1h: number }> => {
  const t24h = await sweepKind('t24h', 24);
  const t1h = await sweepKind('t1h', 1);
  return { t24h, t1h };
};
