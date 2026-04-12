import { pool } from '../../core/database/client';
import { addCalendarMonths } from '../../core/datetime/addCalendarMonths';
import {
  hostingPromoRegistrationDeadline,
  hostingPromoUnlimitedUntil,
} from '../../core/config/hosting';
import {
  getAppConfigSnapshot,
  type AppConfigSnapshot,
} from '../app-config/appConfig.service';
import { applyDeltaWithClient, reconcileSparkMirrorForUser } from '../spark/spark.repository';
import {
  lockUserForGrants,
  getWaitlistSignupForEmail,
  claimWaitlistTierBundleWithClient,
  claimRegularLoginSparkGrantWithClient,
  applyHostingPromoBackfill,
} from './users.repository';

/** Clock skew / “joined waitlist then signed up in same session” tolerance. */
const WAITLIST_BEFORE_ACCOUNT_GRACE_MS = 120_000;

const waitlistSignupQualifiesForBundle = (
  waitlistCreatedAt: Date,
  userCreatedAt: Date,
  requireBeforeAccount: boolean
): boolean => {
  if (!requireBeforeAccount) return true;
  return waitlistCreatedAt.getTime() <= userCreatedAt.getTime() + WAITLIST_BEFORE_ACCOUNT_GRACE_MS;
};

const runHostingPromoBackfill = async (userId: string, snapshot: AppConfigSnapshot) => {
  const regEnd =
    snapshot.hostingPromoRegistrationEnd ?? hostingPromoRegistrationDeadline();
  const unlimitedEnd =
    snapshot.hostingPromoUnlimitedEnd ?? hostingPromoUnlimitedUntil();
  if (regEnd && unlimitedEnd) {
    await applyHostingPromoBackfill(userId, unlimitedEnd, regEnd);
  }
};

/**
 * One-time sparks + tier flags after register/login.
 * Order: waitlist bundle (if eligible) OR regular first-login grant — never both.
 */
export const applyPostAuthGrants = async (userId: string) => {
  const snapshot = await getAppConfigSnapshot();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await lockUserForGrants(client, userId);
    if (!user) {
      await client.query('ROLLBACK');
      await runHostingPromoBackfill(userId, snapshot);
      return;
    }

    await reconcileSparkMirrorForUser(userId, client);

    if (user.waitlist_spark_bonus_at) {
      await client.query('COMMIT');
      await runHostingPromoBackfill(userId, snapshot);
      return;
    }

    const ws = await getWaitlistSignupForEmail(client, user.email);
    if (
      ws &&
      waitlistSignupQualifiesForBundle(
        ws.created_at,
        user.created_at,
        snapshot.waitlistBenefitsRequireSignupBeforeAccount
      )
    ) {
      const tier =
        ws.signup_position <= snapshot.waitlistTier1MaxPosition ? 'tier1' : 'tier2';
      const grantTotal =
        tier === 'tier1'
          ? snapshot.waitlistTier1SparkGrantTotal
          : snapshot.waitlistTier2SparkGrantTotal;
      const amount = Math.floor(grantTotal);
      if (amount > 0) {
        await applyDeltaWithClient(client, {
          userId,
          amount,
          reason: 'waitlist_tier_grant',
          metadata: { tier, signup_position: ws.signup_position },
        });
      }
      const discountUntil =
        tier === 'tier1'
          ? addCalendarMonths(
              new Date(),
              Math.max(1, Math.floor(snapshot.waitlistTier1DiscountMonths))
            )
          : null;
      const claimed = await claimWaitlistTierBundleWithClient(
        client,
        userId,
        tier,
        discountUntil
      );
      if (!claimed) {
        await client.query('ROLLBACK');
        await runHostingPromoBackfill(userId, snapshot);
        return;
      }
      await client.query('COMMIT');
      await runHostingPromoBackfill(userId, snapshot);
      return;
    }

    if (!user.regular_login_spark_grant_at) {
      const regAmt = Math.floor(snapshot.regularFirstLoginSparkGrant);
      if (regAmt > 0) {
        await applyDeltaWithClient(client, {
          userId,
          amount: regAmt,
          reason: 'regular_login_spark_grant',
          metadata: {},
        });
      }
      const ok = await claimRegularLoginSparkGrantWithClient(client, userId);
      if (!ok) {
        await client.query('ROLLBACK');
        await runHostingPromoBackfill(userId, snapshot);
        return;
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  await runHostingPromoBackfill(userId, snapshot);
};
