import { pool } from '../../core/database/client';
import { reconcileSparkMirrorForUser } from '../spark/spark.repository';
import {
  GET_AUTH_USER_PAYLOAD,
  PATCH_USER_PROFILE,
  PATCH_USER_LAST_GEO,
  PATCH_PROFILE_NAME,
  MERGE_USER_APP_PREFERENCES,
  LOCK_USER_FOR_GRANTS,
  GET_WAITLIST_SIGNUP_FOR_EMAIL,
  CLAIM_WAITLIST_TIER_BUNDLE,
  CLAIM_REGULAR_LOGIN_SPARK_GRANT,
  INCREMENT_SPARK_WELCOME_PAID_HOSTINGS,
  APPLY_HOSTING_PROMO_BACKFILL,
  GET_USER_HOSTING_ROW_FOR_UPDATE,
} from './users.queries';

export const findAuthUserPayload = async (userId: string) => {
  await reconcileSparkMirrorForUser(userId);
  const { rows } = await pool.query(GET_AUTH_USER_PAYLOAD, [userId]);
  return rows[0] ?? null;
};

export type PatchUserInput = {
  defaultCity?: string | null;
  firstName?: string | null;
  pushNotificationsEnabled?: boolean | null;
  inAppNotificationsEnabled?: boolean | null;
  appPreferences?: Record<string, unknown> | null;
  lastKnownLatitude?: number | null;
  lastKnownLongitude?: number | null;
};

export const patchUser = async (userId: string, input: PatchUserInput) => {
  const { rows } = await pool.query(PATCH_USER_PROFILE, [
    userId,
    input.defaultCity !== undefined ? input.defaultCity : null,
    input.pushNotificationsEnabled !== undefined ? input.pushNotificationsEnabled : null,
    input.inAppNotificationsEnabled !== undefined ? input.inAppNotificationsEnabled : null,
  ]);
  const row = rows[0];
  if (!row) return null;
  if (input.firstName !== undefined && input.firstName !== null) {
    await pool.query(PATCH_PROFILE_NAME, [userId, input.firstName]);
  }
  if (input.appPreferences && Object.keys(input.appPreferences).length > 0) {
    await pool.query(MERGE_USER_APP_PREFERENCES, [
      userId,
      JSON.stringify(input.appPreferences),
    ]);
  }
  if (
    input.lastKnownLatitude != null &&
    input.lastKnownLongitude != null &&
    Number.isFinite(input.lastKnownLatitude) &&
    Number.isFinite(input.lastKnownLongitude)
  ) {
    await pool.query(PATCH_USER_LAST_GEO, [
      userId,
      input.lastKnownLatitude,
      input.lastKnownLongitude,
    ]);
  }
  return findAuthUserPayload(userId);
};

export type GrantUserRow = {
  user_id: string;
  email: string;
  created_at: Date;
  waitlist_spark_bonus_at: Date | null;
  regular_login_spark_grant_at: Date | null;
};

export const lockUserForGrants = async (client: import('pg').PoolClient, userId: string) => {
  const { rows } = await client.query(LOCK_USER_FOR_GRANTS, [userId]);
  return rows[0] as GrantUserRow | undefined;
};

export const getWaitlistSignupForEmail = async (
  client: import('pg').PoolClient,
  email: string
) => {
  const { rows } = await client.query(GET_WAITLIST_SIGNUP_FOR_EMAIL, [email]);
  return rows[0] as { signup_position: number; created_at: Date } | undefined;
};

export const claimWaitlistTierBundleWithClient = async (
  client: import('pg').PoolClient,
  userId: string,
  tier: 'tier1' | 'tier2',
  discountUntil: Date | null
) => {
  const { rows } = await client.query(CLAIM_WAITLIST_TIER_BUNDLE, [userId, tier, discountUntil]);
  return rows.length > 0;
};

export const claimRegularLoginSparkGrantWithClient = async (
  client: import('pg').PoolClient,
  userId: string
) => {
  const { rows } = await client.query(CLAIM_REGULAR_LOGIN_SPARK_GRANT, [userId]);
  return rows.length > 0;
};

export const incrementSparkWelcomePaidHostingsWithClient = async (
  client: import('pg').PoolClient,
  userId: string,
  welcomeCap: number
) => {
  const { rows } = await client.query(INCREMENT_SPARK_WELCOME_PAID_HOSTINGS, [userId, welcomeCap]);
  return rows[0] as { spark_welcome_paid_hostings_used: number } | undefined;
};

export const applyHostingPromoBackfill = async (
  userId: string,
  unlimitedUntil: Date,
  registrationDeadline: Date
) => {
  const { rows } = await pool.query(APPLY_HOSTING_PROMO_BACKFILL, [
    userId,
    unlimitedUntil,
    registrationDeadline,
  ]);
  return rows.length > 0;
};

export const lockUserForHosting = async (client: import('pg').PoolClient, userId: string) => {
  await reconcileSparkMirrorForUser(userId, client);
  const { rows } = await client.query(GET_USER_HOSTING_ROW_FOR_UPDATE, [userId]);
  return rows[0] ?? null;
};

