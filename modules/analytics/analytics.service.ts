// track() is intentionally fire-and-forget safe.
// Any other service can call it without worrying about it throwing.

import * as analyticsRepository from './analytics.repository';
import { TrackInput, InsertAnalyticsEvent, AnalyticsSource } from './analytics.types';

const MAX_EVENTS_PER_BATCH = 100;

export const track = async (input: TrackInput): Promise<number> => {
  try {
    const source: AnalyticsSource = input.source ?? 'web';
    const events = input.events.slice(0, MAX_EVENTS_PER_BATCH);

    const rows: InsertAnalyticsEvent[] = events.map(e => ({
      sessionId:   input.session_id,
      source,
      eventType:   e.event_type,
      element:     e.element     ?? null,
      page:        e.page        ?? null,
      entityType:  e.entity_type ?? null,
      entityId:    e.entity_id   ?? null,
      userId:      e.user_id     ?? null,
      utmSource:   e.utm_source  ?? null,
      utmCampaign: e.utm_campaign ?? null,
      city:        e.city        ?? null,
      metadata:    e.metadata    ?? null,
      clientTs:    e.ts ? new Date(e.ts) : null,
    }));

    await analyticsRepository.bulkInsert(rows);
    return rows.length;
  } catch (err) {
    // Never surface analytics errors to callers
    console.error('[analytics] track failed:', err);
    return 0;
  }
};

export const getSummary = async (from: string, to: string) => {
  return analyticsRepository.getSummary(from, to);
};

export const getTopElements = async (from: string, to: string) => {
  return analyticsRepository.getTopElements(from, to);
};

export const getScrollDepth = async (from: string, to: string) => {
  return analyticsRepository.getScrollDepth(from, to);
};

export const getConversionsBySource = async (from: string, to: string) => {
  return analyticsRepository.getConversionsBySource(from, to);
};