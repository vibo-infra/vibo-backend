import { pool } from '../../core/database/client';
import {
  CREATE_LOCATION,
  CREATE_EVENT,
  GET_EVENTS_BY_LOCATION,
  GET_EVENT_BY_ID,
} from './events.queries';

export const createLocation = async (data: {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  placeName: string;
}) => {
  const { rows } = await pool.query(CREATE_LOCATION, [
    data.address, data.city, data.state, data.country,
    data.pincode ?? null, data.latitude, data.longitude, data.placeName,
  ]);
  return rows[0];
};

export const createEvent = async (data: {
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
}) => {
  const { rows } = await pool.query(CREATE_EVENT, [
    data.hostId, data.categoryId, data.locationId,
    data.eventName, data.eventDescription ?? null,
    data.coverImageUrl ?? null, data.startTime,
    data.endTime ?? null, data.capacity ?? null,
    data.isFree, data.price ?? null,
    data.requiresApproval, data.isPrivate,
    data.audienceType, data.status,
  ]);
  return rows[0];
};

export const getEventsByLocation = async (params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  offset: number;
}) => {
  const { rows } = await pool.query(GET_EVENTS_BY_LOCATION, [
    params.latitude,
    params.longitude,
    params.radiusKm,
    params.limit,
    params.offset,
  ]);
  return rows;
};

export const getEventById = async (eventId: string) => {
  const { rows } = await pool.query(GET_EVENT_BY_ID, [eventId]);
  return rows[0] ?? null;
};