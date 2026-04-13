import { pool } from '../../core/database/client';
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
    if (sparkCost > 0) {
      const insufficientMessage = buildPaidHostingInsufficientMessage(
        sparkCost,
        paidPricingReason
      );
      const { transactionId } = await applyDeltaWithClient(client, {
        userId: hostId,
        amount: -sparkCost,
        reason: 'paid_event_hosting',
        metadata: { eventName: body.eventName, pricing_reason: paidPricingReason },
        insufficientMessage,
      });
      hostingTxId = transactionId;
    }

    const location = await eventsRepository.createLocationWithClient(client, body.location);

    const event = await eventsRepository.createEventWithClient(client, {
      hostId,
      categoryId: body.categoryId,
      locationId: location.location_id,
      eventName: body.eventName,
      eventDescription: body.eventDescription,
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      capacity: body.capacity,
      isFree,
      price: body.price,
      requiresApproval: body.requiresApproval ?? false,
      isPrivate: body.isPrivate ?? false,
      audienceType: body.audienceType ?? 'everyone',
      status,
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

    if (status === 'published') {
      await notificationsService.createInAppNotification({
        userId: hostId,
        title: 'Event published',
        body: `${event.event_name} is live for nearby members.`,
        data: { type: 'event_published', eventId: event.event_id },
      });
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
  return { liked };
};

export const getMyUpcomingEvents = async (userId: string) => {
  const hosted = await eventsRepository.listMyUpcomingHostedEvents(userId);
  return { hosted, registered: [] as unknown[] };
};

export const listCategories = () => eventsRepository.listCategories();

export const listReviews = (eventId: string) => eventsRepository.listEventReviews(eventId);

export const submitReview = async (
  eventId: string,
  reviewerId: string,
  body: { rating?: number | null; comment?: string | null }
) => {
  const meta = await eventsRepository.getEventHostId(eventId);
  if (!meta) {
    throw new Error('EVENT_NOT_FOUND');
  }
  if (meta.host_id === reviewerId) {
    throw new Error('SELF_REVIEW');
  }

  const rating =
    body.rating === undefined || body.rating === null ? null : Number(body.rating);
  const comment = body.comment?.trim() ? body.comment.trim() : null;

  if (rating === null && !comment) {
    throw new Error('REVIEW_EMPTY');
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new Error('INVALID_RATING');
  }

  return eventsRepository.upsertEventReview(eventId, reviewerId, rating, comment);
};
