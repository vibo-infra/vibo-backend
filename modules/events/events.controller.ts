import { Request, Response } from 'express';
import * as eventsService from './events.service';
import * as eventsRepository from './events.repository';
import {
  isInsufficientSparksError,
  sendInsufficientSparks,
} from '../spark/insufficientSparksError';

export const listCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await eventsService.listCategories();
    return res.status(200).json({ categories });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load categories' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const event = await eventsService.createEvent(req.user.userId, req.body);
    return res.status(201).json({ event });
  } catch (err: any) {
    console.error(err);
    if (isInsufficientSparksError(err)) {
      return sendInsufficientSparks(res, err);
    }
    if (err.message === 'HOST_VERIFICATION_REQUIRED' || err.message === 'HOST_NOT_VERIFIED') {
      return res.status(403).json({
        error: 'Verified account required to host',
        code: 'HOST_VERIFICATION_REQUIRED',
      });
    }
    if (err.message === 'HOSTING_WAITLIST_REQUIRED') {
      return res.status(403).json({
        error: 'Hosting is limited before launch; join the waitlist with this email to create events.',
        code: 'HOSTING_WAITLIST_REQUIRED',
      });
    }
    if (err.message === 'ACCOUNT_INACTIVE') {
      return res.status(403).json({ error: 'Account is inactive', code: 'ACCOUNT_INACTIVE' });
    }
    if (err.message === 'ACCOUNT_BANNED') {
      return res.status(403).json({ error: 'Account cannot host events', code: 'ACCOUNT_BANNED' });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message === 'HOSTING_IDENTITY_REQUIRED') {
      return res.status(403).json({
        error: 'Verified ID required to host events on this account.',
        code: 'HOSTING_IDENTITY_REQUIRED',
      });
    }
    if (err.message === 'WELCOME_HOSTING_SLOT_STATE_MISMATCH') {
      return res.status(409).json({
        error: 'Could not confirm welcome hosting slot. Please try again.',
        code: 'WELCOME_HOSTING_SLOT_STATE_MISMATCH',
      });
    }
    if (err.message === 'SPARK_WALLET_MISSING') {
      return res.status(500).json({ error: 'Wallet not ready; try again shortly', code: 'SPARK_WALLET_MISSING' });
    }
    return res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEventsByLocation = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, page, limit, city, categoryId } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const result = await eventsService.getEventsByLocation({
      latitude: parseFloat(lat as string),
      longitude: parseFloat(lng as string),
      radiusKm: radius ? parseFloat(radius as string) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      city: city !== undefined && city !== null ? String(city) : null,
      categoryId: categoryId !== undefined && categoryId !== null ? String(categoryId) : null,
      viewerUserId: req.viewerUserId ?? null,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getMyUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.getMyUpcomingEvents(req.user.userId);
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load your events' });
  }
};

export const getMyAllEvents = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.getMyAllEvents(req.user.userId);
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load your events' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await eventsRepository.getEventById(
      req.params.id as string,
      req.viewerUserId ?? null,
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.status(200).json({ event });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
};

export const toggleEventLike = async (req: Request, res: Response) => {
  try {
    const { liked, likeCount } = await eventsService.toggleEventLike(
      req.user.userId,
      req.params.id as string,
    );
    return res.status(200).json({ liked, likeCount });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EVENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Event not found' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to update save' });
  }
};

export const getEventReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await eventsService.listReviews(req.params.id as string);
    return res.status(200).json({ reviews });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load reviews' });
  }
};

export const postEventReview = async (req: Request, res: Response) => {
  try {
    const review = await eventsService.submitReview(req.params.id as string, req.user.userId, {
      rating: req.body?.rating,
      peerRating: req.body?.peerRating ?? req.body?.peer_rating,
      comment: req.body?.comment,
    });
    return res.status(201).json({ review });
  } catch (err: any) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (err.message === 'SELF_REVIEW') {
      return res.status(400).json({ error: 'You cannot review your own event' });
    }
    if (err.message === 'NOT_ATTENDED') {
      return res.status(403).json({ error: 'You can only review events you joined' });
    }
    if (err.message === 'EVENT_NOT_ENDED') {
      return res.status(400).json({ error: 'Reviews open after the event ends' });
    }
    if (err.message === 'REVIEW_EMPTY') {
      return res.status(400).json({ error: 'Add host stars, group vibe, and/or a comment' });
    }
    if (err.message === 'INVALID_RATING' || err.message === 'INVALID_PEER_RATING') {
      return res.status(400).json({ error: 'Ratings must be whole numbers from 1 to 5' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to save review' });
  }
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id as string;
    const r = await eventsService.registerForEvent(eventId, req.user.userId);
    if (!r.ok) {
      const map: Record<string, { status: number; error: string }> = {
        EVENT_NOT_FOUND: { status: 404, error: 'Event not found' },
        HOST_CANNOT_REGISTER: { status: 400, error: 'Hosts join from their dashboard' },
        EVENT_NOT_PUBLISHED: { status: 400, error: 'This event is not open to join' },
        EVENT_STARTED: { status: 400, error: 'This event has already started' },
        EVENT_FULL: { status: 409, error: 'This event is full' },
      };
      const m = map[r.code];
      return res.status(m?.status ?? 400).json({ error: m?.error ?? 'Cannot register' });
    }
    return res.status(r.alreadyRegistered ? 200 : 201).json({
      ok: true,
      alreadyRegistered: r.alreadyRegistered,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to register' });
  }
};

export const deleteEventAsHost = async (req: Request, res: Response) => {
  try {
    await eventsService.deleteEventAsHost(req.params.id as string, req.user.userId);
    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'DELETE_NOT_ALLOWED') {
      return res.status(403).json({
        error: 'You can only delete at least 24 hours before the event starts',
      });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
};

export const getHostPublicProfile = async (req: Request, res: Response) => {
  try {
    const hostId = req.params.hostId as string;
    if (!UUID_RE.test(hostId)) {
      return res.status(400).json({ error: 'Invalid host id' });
    }
    const data = await eventsService.getHostPublicProfile(hostId);
    return res.status(200).json(data);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};
