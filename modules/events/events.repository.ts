import type { Pool, PoolClient } from 'pg';
import { pool } from '../../core/database/client';
import {
  CREATE_LOCATION,
  CREATE_EVENT,
  GET_EVENTS_BY_LOCATION,
  GET_EVENT_BY_ID,
  LIST_EVENT_CATEGORIES,
  GET_EVENT_HOST_ID,
  UPSERT_EVENT_REVIEW,
  LIST_EVENT_REVIEWS,
  LIST_MY_UPCOMING_HOSTED_EVENTS,
  LIST_MY_REGISTERED_UPCOMING_EVENTS,
  LIST_MY_PAST_HOSTED_EVENTS,
  LIST_MY_REGISTERED_PAST_EVENTS,
  LOCK_EVENT_FOR_REGISTRATION,
  INSERT_EVENT_REGISTRATION,
  REACTIVATE_EVENT_REGISTRATION,
  INCREMENT_EVENT_ATTENDEE_COUNT,
  CANCEL_EVENT_REGISTRATION,
  DECREMENT_EVENT_ATTENDEE_COUNT,
  CANCEL_EVENT_BY_HOST,
  EVENT_REVIEW_ELIGIBILITY,
  HOST_PUBLIC_AGG,
  LIST_PAST_HOSTED_EVENTS_WITH_STATS,
  DELETE_EVENT_LIKE,
  INSERT_EVENT_LIKE,
  INSERT_EVENT_CHECKIN,
  LIST_EVENT_INTEREST_USER_IDS,
  GET_EVENT_FOR_NEARBY_NOTIFY,
  LIST_USER_IDS_NEAR_POINT,
  UPDATE_EVENT_INTEREST_BROADCAST_AT,
} from './events.queries';

type LocationInput = {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  placeName: string;
};

type EventInsertInput = {
  hostId: string;
  categoryId: string;
  locationId: string;
  eventName: string;
  eventDescription?: string;
  coverImageUrl?: string;
  startTime: Date;
  endTime?: Date;
  capacity?: number;
  isFree: boolean;
  price?: number;
  requiresApproval: boolean;
  isPrivate: boolean;
  audienceType: string;
  status: string;
  easeTags?: string[];
  source: string;
};

const insertLocation = async (db: Pool | PoolClient, data: LocationInput) => {
  const addressLine =
    [data.placeName?.trim(), data.address?.trim()].filter(Boolean).join(' · ') || null;
  const { rows } = await db.query(CREATE_LOCATION, [
    addressLine,
    data.city,
    data.state,
    data.country,
    data.pincode ?? null,
    data.latitude,
    data.longitude,
  ]);
  return rows[0];
};

const insertEventRow = async (db: Pool | PoolClient, data: EventInsertInput) => {
  const tags = Array.isArray(data.easeTags)
    ? data.easeTags.map((t) => String(t).trim()).filter((t) => t.length > 0 && t.length <= 32).slice(0, 8)
    : [];
  const { rows } = await db.query(CREATE_EVENT, [
    data.hostId,
    data.categoryId,
    data.locationId,
    data.eventName,
    data.eventDescription ?? null,
    data.coverImageUrl ?? null,
    data.startTime,
    data.endTime ?? null,
    data.capacity ?? null,
    data.isFree,
    data.price ?? null,
    data.requiresApproval,
    data.isPrivate,
    data.audienceType,
    data.status,
    tags,
    data.source,
  ]);
  return rows[0];
};

export const createLocation = async (data: LocationInput) => insertLocation(pool, data);

export const createEvent = async (data: EventInsertInput) => insertEventRow(pool, data);

export const getEventsByLocation = async (params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  offset: number;
  city?: string | null;
  categoryId?: string | null;
  viewerUserId?: string | null;
}) => {
  const city = params.city?.trim() ? params.city.trim() : null;
  const categoryId = params.categoryId?.trim() ? params.categoryId.trim() : null;
  const { rows } = await pool.query(GET_EVENTS_BY_LOCATION, [
    params.latitude,
    params.longitude,
    params.radiusKm,
    params.limit,
    params.offset,
    city,
    categoryId,
    params.viewerUserId ?? null,
  ]);
  return rows;
};

export const listMyUpcomingHostedEvents = async (hostId: string) => {
  const { rows } = await pool.query(LIST_MY_UPCOMING_HOSTED_EVENTS, [hostId]);
  return rows;
};

export const listMyRegisteredUpcomingEvents = async (userId: string) => {
  const { rows } = await pool.query(LIST_MY_REGISTERED_UPCOMING_EVENTS, [userId]);
  return rows;
};

export const listMyPastHostedEvents = async (hostId: string) => {
  const { rows } = await pool.query(LIST_MY_PAST_HOSTED_EVENTS, [hostId]);
  return rows;
};

export const listMyRegisteredPastEvents = async (userId: string) => {
  const { rows } = await pool.query(LIST_MY_REGISTERED_PAST_EVENTS, [userId]);
  return rows;
};

export const getEventById = async (eventId: string, viewerUserId: string | null = null) => {
  const { rows } = await pool.query(GET_EVENT_BY_ID, [eventId, viewerUserId]);
  return rows[0] ?? null;
};

export const toggleEventLike = async (eventId: string, userId: string): Promise<boolean> => {
  const del = await pool.query(DELETE_EVENT_LIKE, [eventId, userId]);
  if (del.rowCount && del.rowCount > 0) {
    return false;
  }
  const ins = await pool.query(INSERT_EVENT_LIKE, [eventId, userId]);
  return (ins.rowCount ?? 0) > 0;
};

export const countEventLikes = async (eventId: string): Promise<number> => {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS c FROM event_like WHERE event_id = $1::uuid',
    [eventId],
  );
  return Number(rows[0]?.c ?? 0);
};

export const createLocationWithClient = (client: PoolClient, data: LocationInput) =>
  insertLocation(client, data);

export const createEventWithClient = (client: PoolClient, data: EventInsertInput) =>
  insertEventRow(client, data);

export const listCategories = async () => {
  const { rows } = await pool.query(LIST_EVENT_CATEGORIES);
  return rows;
};

export const getEventHostId = async (eventId: string) => {
  const { rows } = await pool.query(GET_EVENT_HOST_ID, [eventId]);
  return rows[0] as { host_id: string } | undefined;
};

export const upsertEventReview = async (
  eventId: string,
  reviewerId: string,
  rating: number | null,
  comment: string | null,
  peerRating: number | null
) => {
  const { rows } = await pool.query(UPSERT_EVENT_REVIEW, [
    eventId,
    reviewerId,
    rating,
    comment,
    peerRating,
  ]);
  return rows[0];
};

export const listEventReviews = async (eventId: string) => {
  const { rows } = await pool.query(LIST_EVENT_REVIEWS, [eventId]);
  return rows;
};

export const registerForEvent = async (eventId: string, userId: string, source: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(LOCK_EVENT_FOR_REGISTRATION, [eventId]);
    const row = rows[0] as
      | {
          event_id: string;
          host_id: string;
          capacity: number | null;
          current_attendee_count: number;
          status: string;
          start_time: Date;
        }
      | undefined;
    if (!row) {
      await client.query('ROLLBACK');
      return { ok: false as const, code: 'EVENT_NOT_FOUND' as const };
    }
    if (row.host_id === userId) {
      await client.query('ROLLBACK');
      return { ok: false as const, code: 'HOST_CANNOT_REGISTER' as const };
    }
    if (row.status !== 'published') {
      await client.query('ROLLBACK');
      return { ok: false as const, code: 'EVENT_NOT_PUBLISHED' as const };
    }
    if (new Date(row.start_time) <= new Date()) {
      await client.query('ROLLBACK');
      return { ok: false as const, code: 'EVENT_STARTED' as const };
    }
    const cap = row.capacity != null ? Number(row.capacity) : null;
    const cnt = Number(row.current_attendee_count ?? 0);
    if (cap != null && cnt >= cap) {
      await client.query('ROLLBACK');
      return { ok: false as const, code: 'EVENT_FULL' as const };
    }
    const ins = await client.query(INSERT_EVENT_REGISTRATION, [eventId, userId, source]);
    if (!ins.rowCount) {
      const react = await client.query(REACTIVATE_EVENT_REGISTRATION, [eventId, userId, source]);
      if (react.rowCount) {
        await client.query(INCREMENT_EVENT_ATTENDEE_COUNT, [eventId]);
        await client.query('COMMIT');
        return { ok: true as const, alreadyRegistered: false as const };
      }
      await client.query('COMMIT');
      return { ok: true as const, alreadyRegistered: true as const };
    }
    await client.query(INCREMENT_EVENT_ATTENDEE_COUNT, [eventId]);
    await client.query('COMMIT');
    return { ok: true as const, alreadyRegistered: false as const };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const cancelRegistrationForEvent = async (
  eventId: string,
  userId: string,
  withdrawalNote: string | null
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const note = withdrawalNote?.trim() ? withdrawalNote.trim().slice(0, 2000) : null;
    const upd = await client.query(CANCEL_EVENT_REGISTRATION, [eventId, userId, note]);
    if (!upd.rowCount) {
      await client.query('ROLLBACK');
      return { ok: false as const, code: 'NOT_REGISTERED' as const };
    }
    await client.query(DECREMENT_EVENT_ATTENDEE_COUNT, [eventId]);
    await client.query('COMMIT');
    return { ok: true as const };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const cancelEventByHost = async (eventId: string, hostId: string) => {
  const { rows } = await pool.query(CANCEL_EVENT_BY_HOST, [eventId, hostId]);
  return rows.length > 0;
};

export const getEventReviewEligibility = async (eventId: string, reviewerId: string) => {
  const { rows } = await pool.query(EVENT_REVIEW_ELIGIBILITY, [eventId, reviewerId]);
  return rows[0] as
    | {
        host_id: string;
        is_registered: boolean;
        event_ended: boolean;
      }
    | undefined;
};

export const getHostPublicAgg = async (hostId: string) => {
  const { rows } = await pool.query(HOST_PUBLIC_AGG, [hostId]);
  return rows[0] as
    | {
        first_name: string;
        last_name: string | null;
        is_verified: boolean;
        past_hosted_count: number;
        avg_host_rating: string | null;
        review_count: number;
      }
    | undefined;
};

export const listPastHostedEventsWithStats = async (hostId: string) => {
  const { rows } = await pool.query(LIST_PAST_HOSTED_EVENTS_WITH_STATS, [hostId]);
  return rows;
};

export const upsertEventCheckin = async (eventId: string, userId: string) => {
  const { rows } = await pool.query(INSERT_EVENT_CHECKIN, [eventId, userId]);
  return rows.length > 0;
};

export const listEventInterestUserIds = async (eventId: string): Promise<string[]> => {
  const { rows } = await pool.query(LIST_EVENT_INTEREST_USER_IDS, [eventId]);
  return (rows as { uid: string }[]).map((r) => r.uid).filter(Boolean);
};

export const getEventForNearbyNotify = async (eventId: string) => {
  const { rows } = await pool.query(GET_EVENT_FOR_NEARBY_NOTIFY, [eventId]);
  return rows[0] as
    | {
        event_id: string;
        event_name: string;
        host_id: string;
        latitude: string | number;
        longitude: string | number;
      }
    | undefined;
};

export const listUserIdsNearPoint = async (
  excludeUserId: string,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<string[]> => {
  const { rows } = await pool.query(LIST_USER_IDS_NEAR_POINT, [excludeUserId, lat, lng, radiusKm]);
  return (rows as { user_id: string }[]).map((r) => r.user_id);
};

export const touchEventInterestBroadcastAt = async (eventId: string) => {
  await pool.query(UPDATE_EVENT_INTEREST_BROADCAST_AT, [eventId]);
};

export const hasAttendeePushSent = async (eventId: string, userId: string, kind: string) => {
  const { rows } = await pool.query(
    `SELECT 1 FROM event_attendee_push_sent WHERE event_id = $1::uuid AND user_id = $2::uuid AND kind = $3 LIMIT 1`,
    [eventId, userId, kind],
  );
  return rows.length > 0;
};

export const markAttendeePushSent = async (eventId: string, userId: string, kind: string) => {
  await pool.query(
    `INSERT INTO event_attendee_push_sent (event_id, user_id, kind) VALUES ($1::uuid, $2::uuid, $3)
     ON CONFLICT DO NOTHING`,
    [eventId, userId, kind],
  );
};