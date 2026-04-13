import { pool } from '../../core/database/client';
import {
  INSERT_NOTIFICATION,
  LIST_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  UPSERT_PUSH_TOKEN,
  LIST_PUSH_TOKENS_FOR_USER,
  DELETE_PUSH_TOKEN_FOR_USER,
  DELETE_PUSH_TOKENS_BY_VALUE,
  COUNT_NOTIFICATIONS_DATA_CONTAINS_SINCE_DAYS,
} from './notifications.queries';

export const insertNotification = async (params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}) => {
  const { rows } = await pool.query(INSERT_NOTIFICATION, [
    params.userId,
    params.title,
    params.body,
    params.data ? JSON.stringify(params.data) : null,
  ]);
  return rows[0];
};

export const listForUser = async (userId: string, limit: number, offset: number) => {
  const { rows } = await pool.query(LIST_NOTIFICATIONS, [userId, limit, offset]);
  return rows;
};

export const markRead = async (notificationId: string, userId: string) => {
  const { rows } = await pool.query(MARK_NOTIFICATION_READ, [notificationId, userId]);
  return rows[0] ?? null;
};

export const upsertPushToken = async (userId: string, token: string, platform: string) => {
  const { rows } = await pool.query(UPSERT_PUSH_TOKEN, [userId, token, platform]);
  return rows[0];
};

export const listPushTokens = async (userId: string) => {
  const { rows } = await pool.query(LIST_PUSH_TOKENS_FOR_USER, [userId]);
  return rows as { token: string; platform: string }[];
};

export const deletePushTokenForUser = async (userId: string, token: string) => {
  await pool.query(DELETE_PUSH_TOKEN_FOR_USER, [userId, token]);
};

export const deletePushTokensByValue = async (tokens: string[]) => {
  if (!tokens.length) return;
  await pool.query(DELETE_PUSH_TOKENS_BY_VALUE, [tokens]);
};

export const countNotificationsDataContainsSinceDays = async (
  userId: string,
  dataSubset: Record<string, unknown>,
  days: number
): Promise<number> => {
  const { rows } = await pool.query(COUNT_NOTIFICATIONS_DATA_CONTAINS_SINCE_DAYS, [
    userId,
    JSON.stringify(dataSubset),
    days,
  ]);
  const r = rows[0] as { c: number } | undefined;
  return r?.c ?? 0;
};
