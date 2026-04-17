import { getConfigValueByKey } from '../app-config/appConfig.repository';
import * as notificationsService from './notifications.service';
import { PushPayloadType } from './pushPayload';
import * as lifecycleRepo from './eventLifecyclePushes.repository';
import * as eventsRepository from '../events/events.repository';

const WINDOW_MINUTES = 12;
const INTEREST_BROADCAST_COOLDOWN_MS = 45 * 60 * 1000;

/** Host 24h/1h (existing) + attendee interest nudges + post-end recap. */
export const runScheduledEventPushJobs = async (): Promise<{
  attendeeT24h: number;
  attendeeT1h: number;
  attendeePost: number;
}> => {
  let attendeeT24h = 0;
  let attendeeT1h = 0;
  let attendeePost = 0;

  const sweepPre = async (hours: number, kind: 't24h' | 't1h') => {
    const events = await lifecycleRepo.listEventsInAttendeeStartWindow(hours, WINDOW_MINUTES);
    for (const ev of events) {
      const users = await eventsRepository.listEventInterestUserIds(ev.event_id);
      for (const uid of users) {
        if (uid === ev.host_id) continue;
        const done = await eventsRepository.hasAttendeePushSent(ev.event_id, uid, kind);
        if (done) continue;
        const title = kind === 't24h' ? 'Tomorrow' : 'Starting soon';
        const body =
          kind === 't24h'
            ? `Still thinking about "${ev.event_name}"? It starts in ~24 hours.`
            : `"${ev.event_name}" is in about an hour — still a soft yes?`;
        await notificationsService.createInAppNotification({
          userId: uid,
          title,
          body,
          data: { type: PushPayloadType.eventAttendeeNudge, eventId: ev.event_id, reminder: kind },
        });
        await eventsRepository.markAttendeePushSent(ev.event_id, uid, kind);
        if (kind === 't24h') attendeeT24h += 1;
        else attendeeT1h += 1;
      }
    }
  };

  await sweepPre(24, 't24h');
  await sweepPre(1, 't1h');

  const postEvents = await lifecycleRepo.listEventsForPostEndAttendeePush(WINDOW_MINUTES);
  for (const ev of postEvents) {
    const users = await eventsRepository.listEventInterestUserIds(ev.event_id);
    for (const uid of users) {
      if (uid === ev.host_id) continue;
      const done = await eventsRepository.hasAttendeePushSent(ev.event_id, uid, 't_post1h');
      if (done) continue;
      await notificationsService.createInAppNotification({
        userId: uid,
        title: 'How was it?',
        body: `Hope "${ev.event_name}" was good — drop a quick rating when you can.`,
        data: { type: PushPayloadType.eventRecap, eventId: ev.event_id },
      });
      await eventsRepository.markAttendeePushSent(ev.event_id, uid, 't_post1h');
      attendeePost += 1;
    }
  }

  return { attendeeT24h, attendeeT1h, attendeePost };
};

function pickRandomLine(lines: string[], totalInterested: number): string {
  const raw = lines[Math.floor(Math.random() * lines.length)] ?? 'More locals are eyeing this hang.';
  return raw.replace(/\{n\}/g, String(totalInterested));
}

/** When someone taps "Might go", optionally ping others (cooldown + min interest). */
export const notifyInterestMomentumIfNeeded = async (
  eventId: string,
  actorUserId: string,
  newLikeCount: number
): Promise<void> => {
  if (newLikeCount < 2) return;

  const ev = await eventsRepository.getEventById(eventId, null);
  if (!ev) return;
  const row = ev as Record<string, unknown>;
  const name = String(row.event_name ?? 'This event');
  const hostId = String(row.host_id ?? '');
  const lastRaw = row.interest_last_broadcast_at;
  const lastAt = lastRaw ? new Date(String(lastRaw)).getTime() : 0;
  if (lastAt && Date.now() - lastAt < INTEREST_BROADCAST_COOLDOWN_MS) return;

  const rawLines = await getConfigValueByKey('push_interest_momentum_lines');
  const lines = Array.isArray(rawLines)
    ? rawLines.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];

  const peers = (await eventsRepository.listEventInterestUserIds(eventId)).filter(
    (id) => id !== actorUserId && id !== hostId
  );
  if (!peers.length) return;

  const regN = Number((row as { registration_count?: number }).registration_count ?? 0);
  const totalInterested = newLikeCount + regN;

  const body = pickRandomLine(lines.length ? lines : ['This one is picking up — worth another look.'], totalInterested);

  for (const uid of peers) {
    await notificationsService.createInAppNotification({
      userId: uid,
      title: name,
      body,
      data: { type: PushPayloadType.eventInterestMomentum, eventId },
    });
  }
  await eventsRepository.touchEventInterestBroadcastAt(eventId);
};

export const notifyNearbyUsersOfPublishedEvent = async (eventId: string): Promise<number> => {
  const ev = await eventsRepository.getEventForNearbyNotify(eventId);
  if (!ev) return 0;
  const lat = Number(ev.latitude);
  const lng = Number(ev.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 0;

  const userIds = await eventsRepository.listUserIdsNearPoint(ev.host_id, lat, lng, 5);
  let n = 0;
  for (const uid of userIds) {
    await notificationsService.createInAppNotification({
      userId: uid,
      title: 'New near you',
      body: `${ev.event_name} just popped up within ~5km.`,
      data: { type: PushPayloadType.eventNearbyNew, eventId },
    });
    n += 1;
  }
  return n;
};
