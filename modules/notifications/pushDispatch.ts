/**
 * FCM delivery (Firebase Admin SDK). In-app rows are always written in DB separately.
 * Individual: multicast to a user's device tokens.
 * Group: topic message (subscribe clients via RN Firebase `subscribeToTopic`).
 */
import type { MulticastMessage } from 'firebase-admin/messaging';
import { getFirebaseMessaging } from './fcm/initFirebase';
import * as notificationsRepository from './notifications.repository';

const FCM_BATCH = 500;

function toFcmData(data?: Record<string, unknown>): Record<string, string> {
  if (!data) return { type: 'general' };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  if (!out.type) out.type = 'general';
  return out;
}

function isInvalidTokenError(code: string | undefined): boolean {
  if (!code) return false;
  return (
    code.includes('registration-token-not-registered') ||
    code.includes('invalid-registration-token') ||
    code.includes('invalid-argument')
  );
}

function collectInvalidTokens(
  responses: { success: boolean; error?: { code?: string } }[],
  tokens: string[]
): string[] {
  const bad: string[] = [];
  responses.forEach((r, i) => {
    if (r.success) return;
    if (isInvalidTokenError(r.error?.code)) {
      const t = tokens[i];
      if (t) bad.push(t);
    }
  });
  return bad;
}

type MulticastBody = Omit<MulticastMessage, 'tokens'>;

async function sendMulticastChunks(tokens: string[], message: MulticastBody) {
  const messaging = getFirebaseMessaging();
  if (!messaging || !tokens.length) return;

  for (let i = 0; i < tokens.length; i += FCM_BATCH) {
    const chunk = tokens.slice(i, i + FCM_BATCH);
    const payload: MulticastMessage = {
      ...message,
      tokens: chunk,
    };
    let batch: { responses: { success: boolean; error?: { code?: string } }[] };
    try {
      batch = await messaging.sendEachForMulticast(payload);
    } catch (e) {
      console.error('[fcm] sendEachForMulticast failed', e);
      continue;
    }
    const invalid = collectInvalidTokens(batch.responses, chunk);
    if (invalid.length) {
      try {
        await notificationsRepository.deletePushTokensByValue(invalid);
      } catch (e) {
        console.error('[fcm] token cleanup failed', e);
      }
    }
  }
}

/** Per-user devices (primary use case: reminders, sparks, verification). */
export async function dispatchPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const rows = await notificationsRepository.listPushTokens(userId);
  const tokens = rows.map((r) => r.token).filter(Boolean);
  if (!tokens.length) return;

  await sendMulticastChunks(tokens, {
    notification: { title, body },
    data: toFcmData(data),
    android: { priority: 'high' },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  });
}

/**
 * Broadcast / segment push. Topic names must be FCM-safe (no spaces).
 * Example: `city_mumbai_hosts` — app subscribes when user opts in.
 */
export async function dispatchPushToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  const safeTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '_').slice(0, 200);
  if (!safeTopic) return;

  try {
    await messaging.send({
      topic: safeTopic,
      notification: { title, body },
      data: toFcmData(data),
      android: { priority: 'high' },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    });
  } catch (e) {
    console.error('[fcm] topic send failed', safeTopic, e);
  }
}
