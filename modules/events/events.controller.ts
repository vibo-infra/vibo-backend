import { Request, Response } from 'express';
import * as eventsService from './events.service';
import * as eventsRepository from './events.repository';


export const createEvent = async (req: Request, res: Response) => {
  try {
    const event = await eventsService.createEvent(
      req.user.userId, // comes from authenticate middleware
      req.body
    );
    return res.status(201).json({ event });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEventsByLocation = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, page, limit } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const result = await eventsService.getEventsByLocation({
      latitude:  parseFloat(lat as string),
      longitude: parseFloat(lng as string),
      radiusKm:  radius ? parseFloat(radius as string) : undefined,
      page:      page   ? parseInt(page as string)     : undefined,
      limit:     limit  ? parseInt(limit as string)    : undefined,
    });

    return res.status(200).json(result);
  } catch(err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch events' });
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