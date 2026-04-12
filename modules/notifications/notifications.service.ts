import * as notificationsRepository from './notifications.repository';
import { findAuthUserPayload } from '../users/users.repository';
import { dispatchPushToUser } from './pushDispatch';

export const createInAppNotification = async (params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  alsoPush?: boolean;
}) => {
  const row = await notificationsRepository.insertNotification(params);
  if (params.alsoPush !== false) {
    const u = await findAuthUserPayload(params.userId);
    if (u?.push_notifications_enabled) {
      await dispatchPushToUser(params.userId, params.title, params.body, params.data ?? undefined);
    }
  }
  return row;
};

export const listMine = async (userId: string, page: number, limit: number) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const offset = (Math.max(page, 1) - 1) * safeLimit;
  const items = await notificationsRepository.listForUser(userId, safeLimit, offset);
  return { notifications: items, page: Math.max(page, 1), limit: safeLimit };
};

export const markAsRead = async (userId: string, notificationId: string) => {
  return notificationsRepository.markRead(notificationId, userId);
};

export const registerDevice = async (
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web'
) => {
  return notificationsRepository.upsertPushToken(userId, token, platform);
};
