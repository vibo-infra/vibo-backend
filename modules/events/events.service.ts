import { pool } from '../../core/database/client';
import { parseApiDateTime } from '../../core/datetime/parseApiDateTime';
import * as eventsRepository from './events.repository';
import {
  lockUserForHosting,
  incrementSparkWelcomePaidHostingsWithClient,
} from '../users/users.repository';
import { resolveUnlimitedHostingForUser } from '../../core/config/hosting';
import { getAppConfigSnapshot } from '../app-config/appConfig.service';
import {
  applyDeltaWithClient,
  attachTransactionReference,
} from '../spark/spark.repository';
import { assertUserMayHost } from './hostingEligibility';
import {
  resolvePaidListingSparkCost,
  buildPaidHostingInsufficientMessage,
  type PaidHostingResolution,
  type WaitlistTier,
} from '../hosting/paidHostingCost';
import * as notificationsService from '../notifications/notifications.service';
import { PushPayloadType } from '../notifications/pushPayload';
import { notifySparksLowIfCrossedThreshold } from '../notifications/pushTriggers';
import {
  notifyInterestMomentumIfNeeded,
  notifyNearbyUsersOfPublishedEvent,
} from '../notifications/eventLifecyclePushes.service';
import { normalizePlatformSource } from '../../core/utils/platformSource';

const parseWaitlistTier = (v: unknown): WaitlistTier => {
  if (v === 'tier1' || v === 'tier2') return v;
  return null;
};

type CreateEventBody = {
  eventName: string;
  eventDescription?: string;
  categoryId: string;
  startTime: string;
  endTime?: string;
  capacity?: number;
  isFree?: boolean;
  price?: number;
  requiresApproval?: boolean;
  isPrivate?: boolean;
  audienceType?: string;
  publishNow?: boolean;
  /** Short labels shown on cards, e.g. solo-friendly, casual, drop-in */
  easeTags?: string[];
  source?: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    latitude: number;
    longitude: number;
    placeName: string;
  };
};

export const createEvent = async (hostId: string, body: CreateEventBody) => {
  const isFree = body.isFree ?? true;
  const status = body.publishNow ? 'published' : 'draft';
  const config = await getAppConfigSnapshot();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const host = await lockUserForHosting(client, hostId);
    if (!host) {
      throw new Error('USER_NOT_FOUND');
    }

    await assertUserMayHost(client, {
      now,
      host: {
        email: host.email as string,
        is_verified: Boolean(host.is_verified),
        is_active: Boolean(host.is_active),
        banned_at: host.banned_at as Date | string | null,
        identity_verified_at: host.identity_verified_at as Date | string | null | undefined,
      },
      config,
    });

    const unlimited = resolveUnlimitedHostingForUser(
      host.unlimited_hosting_until as Date | string | null,
      config.globalUnlimitedHostingUntil
    );

    let sparkCost = 0;
    let consumeWelcomePaidSlot = false;
    let paidPricingReason: PaidHostingResolution['pricingReason'] = 'standard_paid';

    if (!isFree) {
      if (unlimited) {
        sparkCost = 0;
        paidPricingReason = 'unlimited_hosting_promo';
      } else {
        const discountUntil = host.waitlist_hosting_discount_until
          ? new Date(host.waitlist_hosting_discount_until as string)
          : null;
        const paid = resolvePaidListingSparkCost(
          {
            waitlistTier: parseWaitlistTier(host.waitlist_tier),
            waitlistHostingDiscountUntil: discountUntil,
            sparkWelcomePaidHostingsUsed: Number(host.spark_welcome_paid_hostings_used ?? 0),
          },
          config,
          now
        );
        sparkCost = paid.sparkCost;
        consumeWelcomePaidSlot = paid.consumeWelcomePaidSlot;
        paidPricingReason = paid.pricingReason;
      }
    }

    let hostingTxId: string | undefined;
    let balanceAfterSparkDebit: number | undefined;
    if (sparkCost > 0) {
      const insufficientMessage = buildPaidHostingInsufficientMessage(
        sparkCost,
        paidPricingReason
      );
      const { transactionId, balanceAfter } = await applyDeltaWithClient(client, {
        userId: hostId,
        amount: -sparkCost,
        reason: 'paid_event_hosting',
        metadata: { eventName: body.eventName, pricing_reason: paidPricingReason },
        insufficientMessage,
      });
      hostingTxId = transactionId;
      balanceAfterSparkDebit = balanceAfter;
    }

    const location = await eventsRepository.createLocationWithClient(client, body.location);

    const event = await eventsRepository.createEventWithClient(client, {
      hostId,
      categoryId: body.categoryId,
      locationId: location.location_id,
      eventName: body.eventName,
      eventDescription: body.eventDescription,
      startTime: parseApiDateTime(body.startTime),
      endTime: body.endTime ? parseApiDateTime(body.endTime) : undefined,
      capacity: body.capacity,
      isFree,
      price: body.price,
      requiresApproval: body.requiresApproval ?? false,
      isPrivate: body.isPrivate ?? false,
      audienceType: body.audienceType ?? 'everyone',
      status,
      easeTags: body.easeTags,
      source: normalizePlatformSource(body.source, 'ios'),
    });

    if (hostingTxId && event?.event_id) {
      await attachTransactionReference(
        client,
        hostId,
        hostingTxId,
        'event',
        event.event_id as string
      );
    }

    if (consumeWelcomePaidSlot) {
      const cap = Math.max(0, Math.floor(config.welcomeFreePaidHostingsCount));
      const inc = await incrementSparkWelcomePaidHostingsWithClient(client, hostId, cap);
      if (!inc) {
        throw new Error('WELCOME_HOSTING_SLOT_STATE_MISMATCH');
      }
    }

    await client.query('COMMIT');

    if (sparkCost > 0 && balanceAfterSparkDebit !== undefined) {
      const balanceBefore = balanceAfterSparkDebit + sparkCost;
      void notifySparksLowIfCrossedThreshold(hostId, balanceBefore, balanceAfterSparkDebit);
    }

    if (status === 'published') {
      await notificationsService.createInAppNotification({
        userId: hostId,
        title: 'Event published',
        body: `${event.event_name} is live for nearby members.`,
        data: { type: PushPayloadType.eventPublished, eventId: event.event_id },
      });
      const eid = String(event.event_id ?? '');
      if (eid) {
        void notifyNearbyUsersOfPublishedEvent(eid).catch((err) =>
          console.error('[events] nearby publish notify failed', eid, err)
        );
      }
    }

    return event;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const getEventsByLocation = async (params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
  city?: string | null;
  categoryId?: string | null;
  viewerUserId?: string | null;
}) => {
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const radius = params.radiusKm ?? 10;
  const offset = (page - 1) * limit;

  const events = await eventsRepository.getEventsByLocation({
    latitude: params.latitude,
    longitude: params.longitude,
    radiusKm: radius,
    limit,
    offset,
    city: params.city ?? null,
    categoryId: params.categoryId ?? null,
    viewerUserId: params.viewerUserId ?? null,
  });

  return { events, page, limit };
};

export const toggleEventLike = async (userId: string, eventId: string) => {
  const host = await eventsRepository.getEventHostId(eventId);
  if (!host) {
    throw new Error('EVENT_NOT_FOUND');
  }
  const liked = await eventsRepository.toggleEventLike(eventId, userId);
  const likeCount = await eventsRepository.countEventLikes(eventId);
  if (liked) {
    void notifyInterestMomentumIfNeeded(eventId, userId, likeCount).catch((err) =>
      console.error('[events] interest momentum notify failed', eventId, err)
    );
  }
  return { liked, likeCount };
};

export const getMyUpcomingEvents = async (userId: string) => {
  const hosted = await eventsRepository.listMyUpcomingHostedEvents(userId);
  const registered = await eventsRepository.listMyRegisteredUpcomingEvents(userId);
  return { hosted, registered };
};

export const getMyAllEvents = async (userId: string) => {
  const [hostedUpcoming, hostedPast, registeredUpcoming, registeredPast] = await Promise.all([
    eventsRepository.listMyUpcomingHostedEvents(userId),
    eventsRepository.listMyPastHostedEvents(userId),
    eventsRepository.listMyRegisteredUpcomingEvents(userId),
    eventsRepository.listMyRegisteredPastEvents(userId),
  ]);
  return { hostedUpcoming, hostedPast, registeredUpcoming, registeredPast };
};

export const listCategories = () => eventsRepository.listCategories();

export const listReviews = (eventId: string) => eventsRepository.listEventReviews(eventId);

export const submitReview = async (
  eventId: string,
  reviewerId: string,
  body: {
    rating?: number | null;
    peerRating?: number | null;
    comment?: string | null;
  }
) => {
  const meta = await eventsRepository.getEventHostId(eventId);
  if (!meta) {
    throw new Error('EVENT_NOT_FOUND');
  }
  if (meta.host_id === reviewerId) {
    throw new Error('SELF_REVIEW');
  }

  const elig = await eventsRepository.getEventReviewEligibility(eventId, reviewerId);
  if (!elig) {
    throw new Error('EVENT_NOT_FOUND');
  }
  if (!elig.is_registered) {
    throw new Error('NOT_ATTENDED');
  }
  if (!elig.event_ended) {
    throw new Error('EVENT_NOT_ENDED');
  }

  const rating =
    body.rating === undefined || body.rating === null ? null : Number(body.rating);
  const peerRating =
    body.peerRating === undefined || body.peerRating === null
      ? null
      : Number(body.peerRating);
  const comment = body.comment?.trim() ? body.comment.trim() : null;

  if (rating === null && peerRating === null && !comment) {
    throw new Error('REVIEW_EMPTY');
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new Error('INVALID_RATING');
  }
  if (
    peerRating !== null &&
    (!Number.isInteger(peerRating) || peerRating < 1 || peerRating > 5)
  ) {
    throw new Error('INVALID_PEER_RATING');
  }

  return eventsRepository.upsertEventReview(
    eventId,
    reviewerId,
    rating,
    comment,
    peerRating
  );
};

export const registerForEvent = async (eventId: string, userId: string, source?: string) => {
  return eventsRepository.registerForEvent(
    eventId,
    userId,
    normalizePlatformSource(source, 'ios')
  );
};

export const cancelRegistrationForEvent = async (
  eventId: string,
  userId: string,
  withdrawalNote: string | null | undefined
) => {
  return eventsRepository.cancelRegistrationForEvent(eventId, userId, withdrawalNote ?? null);
};

export const checkInToEvent = async (eventId: string, userId: string) => {
  const row = await eventsRepository.getEventById(eventId, userId);
  if (!row) {
    throw new Error('EVENT_NOT_FOUND');
  }
  const hostId = String((row as { host_id?: string }).host_id ?? '');
  if (hostId === userId) {
    throw new Error('HOST_NO_CHECKIN');
  }
  const liked = Boolean((row as { liked_by_me?: boolean }).liked_by_me);
  const reg = Boolean((row as { is_registered_by_me?: boolean }).is_registered_by_me);
  if (!liked && !reg) {
    throw new Error('CHECKIN_NOT_ELIGIBLE');
  }
  const start = new Date(String((row as { start_time?: string }).start_time ?? ''));
  if (Number.isNaN(start.getTime())) {
    throw new Error('EVENT_NOT_FOUND');
  }
  const now = Date.now();
  const winStart = start.getTime() - 2 * 60 * 60 * 1000;
  const winEnd = start.getTime() + 3 * 60 * 60 * 1000;
  if (now < winStart || now > winEnd) {
    throw new Error('CHECKIN_OUTSIDE_WINDOW');
  }
  await eventsRepository.upsertEventCheckin(eventId, userId);

  const name = String((row as { event_name?: string }).event_name ?? 'The event');
  const peers = (await eventsRepository.listEventInterestUserIds(eventId)).filter((id) => id !== userId);
  for (const uid of peers) {
    await notificationsService.createInAppNotification({
      userId: uid,
      title: 'People are showing up',
      body: `Someone just tapped “I’m here” at ${name}.`,
      data: { type: PushPayloadType.eventCheckinPeer, eventId },
    });
  }
  return { ok: true as const };
};

export const deleteEventAsHost = async (eventId: string, hostId: string) => {
  const ok = await eventsRepository.cancelEventByHost(eventId, hostId);
  if (!ok) {
    throw new Error('DELETE_NOT_ALLOWED');
  }
  return { ok: true };
};

export const getHostPublicProfile = async (hostId: string) => {
  const agg = await eventsRepository.getHostPublicAgg(hostId);
  if (!agg) {
    throw new Error('USER_NOT_FOUND');
  }
  const events = await eventsRepository.listPastHostedEventsWithStats(hostId);
  const withReviews = await Promise.all(
    events.map(async (row: Record<string, unknown>) => {
      const id = String(row.event_id);
      const reviews = await eventsRepository.listEventReviews(id);
      return { event: row, reviews };
    })
  );
  return { host: agg, pastEvents: withReviews };
};
