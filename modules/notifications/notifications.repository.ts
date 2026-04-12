import { pool } from '../../core/database/client';
import {
  INSERT_NOTIFICATION,
  LIST_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  UPSERT_PUSH_TOKEN,
  LIST_PUSH_TOKENS_FOR_USER,
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
