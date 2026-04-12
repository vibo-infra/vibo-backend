/**
 * Push delivery hook. Wire FCM / APNs here when credentials are available.
 * In-app notifications are always stored in DB; this complements them for devices.
 */
import { listPushTokens } from './notifications.repository';

export async function dispatchPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const tokens = await listPushTokens(userId);
  if (!tokens.length) return;
  if (!process.env.FCM_SERVER_KEY?.trim()) {
    return;
  }
  void data;
  void title;
  void body;
  void tokens;
  // Example: batch send via FCM HTTP v1 using tokens — omitted until keys exist.
}
