import { pool } from '../../core/database/client';
import { analyticsQueries } from './analytics.queries';
import { InsertAnalyticsEvent } from './analytics.types';

export const bulkInsert = async (events: InsertAnalyticsEvent[]): Promise<void> => {
  if (events.length === 0) return;

  const flat = events.flatMap(e => [
    e.sessionId,
    e.source,
    e.eventType,
    e.element        ?? null,
    e.page           ?? null,
    e.entityType     ?? null,
    e.entityId       ?? null,
    e.userId         ?? null,
    e.utmSource      ?? null,
    e.utmCampaign    ?? null,
    e.city           ?? null,
    e.metadata       ? JSON.stringify(e.metadata) : null,
    e.clientTs       ?? null,
  ]);

  await pool.query(analyticsQueries.bulkInsert(events.length), flat);
};

export const getSummary = async (from: string, to: string) => {
  const { rows } = await pool.query(analyticsQueries.getSummary, [from, to]);
  return rows[0] ?? null;
};

export const getTopElements = async (from: string, to: string) => {
  const { rows } = await pool.query(analyticsQueries.getTopElements, [from, to]);
  return rows;
};

export const getScrollDepth = async (from: string, to: string) => {
  const { rows } = await pool.query(analyticsQueries.getScrollDepth, [from, to]);
  return rows;
};

export const getConversionsBySource = async (from: string, to: string) => {
  const { rows } = await pool.query(analyticsQueries.getConversionsBySource, [from, to]);
  return rows;
};