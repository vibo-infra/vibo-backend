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
  ]);
  return rows;
};

export const listMyUpcomingHostedEvents = async (hostId: string) => {
  const { rows } = await pool.query(LIST_MY_UPCOMING_HOSTED_EVENTS, [hostId]);
  return rows;
};

export const getEventById = async (eventId: string) => {
  const { rows } = await pool.query(GET_EVENT_BY_ID, [eventId]);
  return rows[0] ?? null;
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
  comment: string | null
) => {
  const { rows } = await pool.query(UPSERT_EVENT_REVIEW, [eventId, reviewerId, rating, comment]);
  return rows[0];
};

export const listEventReviews = async (eventId: string) => {
  const { rows } = await pool.query(LIST_EVENT_REVIEWS, [eventId]);
  return rows;
};