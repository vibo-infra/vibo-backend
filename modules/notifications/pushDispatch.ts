/**
 * FCM delivery (Firebase Admin SDK). In-app rows are always written in DB separately.
 * Individual: multicast to a user's device tokens.
 * Group: topic message (subscribe clients via RN Firebase `subscribeToTopic`).
 *
 * Optional `data` keys for system tray UI (app closed):
 * - `push_image_url` — HTTPS image (Android expanded / iOS when supported).
 * - `push_subtitle` — second line under title (iOS).
 * - `push_tag` — Android: replace prior notification with same tag.
 * - `push_thread_id` — iOS notification grouping.
 */
import type {
  ApnsConfig,
  AndroidConfig,
  Message,
  MulticastMessage,
  Notification,
  Aps,
} from 'firebase-admin/messaging';
import { getFirebaseMessaging } from './fcm/initFirebase';
import * as notificationsRepository from './notifications.repository';

const FCM_BATCH = 500;

/** Must match `vibo_default` in RN `firebase.json` + `MainApplication.kt`. */
const VIBO_PUSH_CHANNEL_ID = 'vibo_default';
/** Android drawable name (no extension) — `@drawable/ic_stat_vibo`. */
const VIBO_NOTIFICATION_ICON = 'ic_stat_vibo';
/** Accent behind status icon; keep in sync with `colors.xml` `notification_accent`. */
const VIBO_NOTIFICATION_COLOR = '#ff9a79';

const FCM_IMAGE_URL_MAX = 2000;

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

function pickString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

/** HTTPS only; invalid URLs are dropped so one bad URL does not fail the send. */
function safeImageUrl(v: unknown): string | undefined {
  const s = pickString(v);
  if (!s) return undefined;
  if (s.length > FCM_IMAGE_URL_MAX) return undefined;
  if (!/^https:\/\/.+/i.test(s)) return undefined;
  return s;
}

type TrayOptions = {
  imageUrl?: string;
  subtitle?: string;
  tag?: string;
  threadId?: string;
};

function trayOptionsFromData(data?: Record<string, unknown>): TrayOptions {
  return {
    imageUrl: safeImageUrl(data?.push_image_url),
    subtitle: pickString(data?.push_subtitle),
    tag: pickString(data?.push_tag),
    threadId: pickString(data?.push_thread_id),
  };
}

function buildNotification(
  title: string,
  body: string,
  tray: TrayOptions
): Notification {
  const n: Notification = { title, body };
  if (tray.imageUrl) n.imageUrl = tray.imageUrl;
  return n;
}

function buildAndroidConfig(tray: TrayOptions): AndroidConfig {
  return {
    priority: 'high',
    notification: {
      channelId: VIBO_PUSH_CHANNEL_ID,
      icon: VIBO_NOTIFICATION_ICON,
      color: VIBO_NOTIFICATION_COLOR,
      ...(tray.imageUrl && { imageUrl: tray.imageUrl }),
      ...(tray.tag && { tag: tray.tag }),
    },
  };
}

function buildApnsConfig(
  title: string,
  body: string,
  tray: TrayOptions,
  badge?: number
): ApnsConfig {
  const img = tray.imageUrl;
  const aps: Aps = { sound: 'default' };
  if (badge !== undefined) aps.badge = badge;

  if (tray.subtitle || tray.threadId || img) {
    aps.alert = tray.subtitle
      ? { title, body, subtitle: tray.subtitle }
      : { title, body };
    if (tray.threadId) aps.threadId = tray.threadId;
    if (img) aps.mutableContent = true;
  }

  return {
    payload: { aps },
    ...(img ? { fcmOptions: { imageUrl: img } } : {}),
  };
}

function buildMulticastBody(
  title: string,
  body: string,
  data: Record<string, string>,
  tray: TrayOptions,
  apnsBadge?: number
): Omit<MulticastMessage, 'tokens'> {
  return {
    notification: buildNotification(title, body, tray),
    data,
    android: buildAndroidConfig(tray),
    apns: buildApnsConfig(title, body, tray, apnsBadge),
  };
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

  const tray = trayOptionsFromData(data);
  await sendMulticastChunks(
    tokens,
    buildMulticastBody(title, body, toFcmData(data), tray, 1)
  );
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

  const tray = trayOptionsFromData(data);
  const bodyPayload = buildMulticastBody(title, body, toFcmData(data), tray);

  const message: Message = {
    topic: safeTopic,
    notification: bodyPayload.notification,
    data: bodyPayload.data,
    android: bodyPayload.android,
    apns: bodyPayload.apns,
  };

  try {
    await messaging.send(message);
  } catch (e) {
    console.error('[fcm] topic send failed', safeTopic, e);
  }
}
