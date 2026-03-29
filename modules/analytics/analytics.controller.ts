import { Request, Response } from 'express';
import * as analyticsService from './analytics.service';

const DEFAULT_DAYS = 7;

const getDateRange = (query: Record<string, string>) => {
  const to   = query.to   ?? new Date().toISOString();
  const from = query.from ?? new Date(Date.now() - DEFAULT_DAYS * 86400000).toISOString();
  return { from, to };
};

export const trackEvents = async (req: Request, res: Response) => {
  try {
    const { session_id, source, events } = req.body;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'session_id is required' });
    }
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events must be a non-empty array' });
    }
    if (events.length > 100) {
      return res.status(400).json({ error: 'Max 100 events per batch' });
    }

    const received = await analyticsService.track({ session_id, source, events });
    return res.status(200).json({ received });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const { from, to } = getDateRange(req.query as Record<string, string>);
    const data = await analyticsService.getSummary(from, to);
    return res.status(200).json({ data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getTopElements = async (req: Request, res: Response) => {
  try {
    const { from, to } = getDateRange(req.query as Record<string, string>);
    const data = await analyticsService.getTopElements(from, to);
    return res.status(200).json({ data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getScrollDepth = async (req: Request, res: Response) => {
  try {
    const { from, to } = getDateRange(req.query as Record<string, string>);
    const data = await analyticsService.getScrollDepth(from, to);
    return res.status(200).json({ data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getConversionsBySource = async (req: Request, res: Response) => {
  try {
    const { from, to } = getDateRange(req.query as Record<string, string>);
    const data = await analyticsService.getConversionsBySource(from, to);
    return res.status(200).json({ data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};