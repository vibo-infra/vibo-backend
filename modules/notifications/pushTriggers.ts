import { getAppConfigSnapshot } from '../app-config/appConfig.service';
import * as notificationsRepository from './notifications.repository';
import * as notificationsService from './notifications.service';
import { PushPayloadType } from './pushPayload';

const DEDUPE_VERIFICATION_DAYS = 14;

export function sparksLowThreshold(): number {
  const raw = process.env.SPARKS_LOW_PUSH_THRESHOLD?.trim();
  const n = raw != null && raw !== '' ? Number(raw) : 50;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 50;
}

/**
 * Call only after the spark wallet transaction has committed.
 * Fires when balance crosses from above threshold to at-or-below (paid hosting debit).
 */
export async function notifySparksLowIfCrossedThreshold(
  userId: string,
  balanceBefore: number,
  balanceAfter: number
): Promise<void> {
  const threshold = sparksLowThreshold();
  if (balanceBefore <= threshold || balanceAfter > threshold || balanceAfter < 0) return;
  try {
    await notificationsService.createInAppNotification({
      userId,
      title: 'Sparks running low',
      body: `You have ${balanceAfter} Sparks left. Add more before your next paid listing.`,
      data: { type: PushPayloadType.sparksLow, balance: String(balanceAfter) },
    });
  } catch (e) {
    console.error('[push] sparks low notify failed', e);
  }
}

async function hasRecentVerificationNudge(
  userId: string,
  focus: 'email' | 'identity'
): Promise<boolean> {
  const n = await notificationsRepository.countNotificationsDataContainsSinceDays(
    userId,
    { type: PushPayloadType.verification, focus },
    DEDUPE_VERIFICATION_DAYS
  );
  return n > 0;
}

/** After login/register when the user record is known (non-blocking for auth latency if voided). */
export async function maybeNotifyVerificationNudge(
  userId: string,
  opts: {
    emailVerified: boolean;
    identityVerifiedAt: Date | string | null | undefined;
  }
): Promise<void> {
  try {
    if (!opts.emailVerified) {
      if (await hasRecentVerificationNudge(userId, 'email')) return;
      await notificationsService.createInAppNotification({
        userId,
        title: 'Verify your email',
        body: 'Please verify your email to secure your VIBO account.',
        data: { type: PushPayloadType.verification, focus: 'email' },
      });
      return;
    }
    const config = await getAppConfigSnapshot();
    if (!config.hostingRequiresIdentityVerification) return;
    if (opts.identityVerifiedAt) return;
    if (await hasRecentVerificationNudge(userId, 'identity')) return;
    await notificationsService.createInAppNotification({
      userId,
      title: 'Complete ID verification',
      body: 'Verify your ID to host paid experiences on VIBO.',
      data: { type: PushPayloadType.verification, focus: 'identity' },
    });
  } catch (e) {
    console.error('[push] verification nudge failed', e);
  }
}
