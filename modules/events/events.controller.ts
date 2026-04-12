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

export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await eventsRepository.getEventById(req.params.id as string);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.status(200).json({ event });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch event' });
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
    if (err.message === 'REVIEW_EMPTY') {
      return res.status(400).json({ error: 'Add a star rating and/or a comment' });
    }
    if (err.message === 'INVALID_RATING') {
      return res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to save review' });
  }
};
