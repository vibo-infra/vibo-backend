import * as eventsRepository from './events.repository';

export const createEvent = async (
  hostId: string,
  body: {
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
  }
) => {
  // Create location first — event references it
  const location = await eventsRepository.createLocation(body.location);

  const event = await eventsRepository.createEvent({
    hostId,
    categoryId: body.categoryId,
    locationId: location.location_id,
    eventName: body.eventName,
    eventDescription: body.eventDescription,
    startTime: new Date(body.startTime),
    endTime: body.endTime ? new Date(body.endTime) : undefined,
    capacity: body.capacity,
    isFree: body.isFree ?? true,
    price: body.price,
    requiresApproval: body.requiresApproval ?? false,
    isPrivate: body.isPrivate ?? false,
    audienceType: body.audienceType ?? 'everyone',
    // publishNow=true → goes live immediately, otherwise saved as draft
    status: body.publishNow ? 'published' : 'draft',
  });

  return event;
};

export const getEventsByLocation = async (params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}) => {
  const limit  = params.limit    ?? 20;
  const page   = params.page     ?? 1;
  const radius = params.radiusKm ?? 10; // default 10km radius
  const offset = (page - 1) * limit;

  const events = await eventsRepository.getEventsByLocation({
    latitude:  params.latitude,
    longitude: params.longitude,
    radiusKm:  radius,
    limit,
    offset,
  });

  return { events, page, limit };
};