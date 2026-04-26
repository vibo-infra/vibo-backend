// The repository is the only file that imports pool.
// It executes queries and returns raw data. No business logic here.

import { pool } from '../../core/database/client';
import {
  FIND_USER_BY_EMAIL,
  CREATE_USER,
  CREATE_PROFILE,
  FIND_USER_ID_BY_REFERRAL_CODE,
  CREATE_SESSION,
  DELETE_SESSION_BY_TOKEN,
  FIND_SESSION_BY_TOKEN,
  ROTATE_SESSION_TOKENS,
  FIND_SESSION_BY_REFRESH_TOKEN,
} from './auth.queries';
import { INSERT_SPARK_WALLET } from '../spark/spark.queries';
import { assignReferralCodeForNewUser } from './referralCode.util';

export const findUserByEmail = async (email: string) => {
  const { rows } = await pool.query(FIND_USER_BY_EMAIL, [email]);
  return rows[0] ?? null;
};

export const findReferrerUserIdByCode = async (code: string | undefined | null) => {
  if (!code || !String(code).trim()) return null;
  const { rows } = await pool.query(FIND_USER_ID_BY_REFERRAL_CODE, [code]);
  return (rows[0] as { user_id: string } | undefined)?.user_id ?? null;
};

export const createUser = async (params: {
  email: string;
  hashedPassword: string;
  defaultCity: string;
  firstName: string;
  referredByUserId: string | null;
  signupSource: string;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(CREATE_USER, [
      params.email,
      params.hashedPassword,
      params.defaultCity.trim(),
      params.referredByUserId,
      params.signupSource,
    ]);
    const user = rows[0];
    await client.query(CREATE_PROFILE, [user.user_id, params.firstName.trim() || 'Guest']);
    await client.query(INSERT_SPARK_WALLET, [user.user_id]);
    await assignReferralCodeForNewUser(client, user.user_id);
    await client.query('COMMIT');
    return user;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const createSession = async (params: {
  userId: string;
  token: string;
  refreshToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  refreshTokenExpiresAt: Date;
  source: string;
}) => {
  const { rows } = await pool.query(CREATE_SESSION, [
    params.userId,
    params.token,
    params.refreshToken,
    params.deviceInfo,
    params.ipAddress,
    params.expiresAt,
    params.refreshTokenExpiresAt,
    params.source,
  ]);
  return rows[0];
};

export const deleteSessionByToken = async (token: string) => {
  await pool.query(DELETE_SESSION_BY_TOKEN, [token]);
};

export const findSessionByToken = async (token: string) => {
  const { rows } = await pool.query(FIND_SESSION_BY_TOKEN, [token]);
  return rows[0] ?? null;
};

export const findSessionByRefreshToken = async (refreshToken: string) => {
  const { rows } = await pool.query(FIND_SESSION_BY_REFRESH_TOKEN, [refreshToken]);
  return rows[0] ?? null;
};

export const rotateSessionTokens = async (params: {
  newToken: string;
  newRefreshToken: string;
  newExpiresAt: Date;
  newRefreshTokenExpiresAt: Date;
  oldRefreshToken: string;
}) => {
  const { rows } = await pool.query(ROTATE_SESSION_TOKENS, [
    params.newToken,
    params.newRefreshToken,
    params.newExpiresAt,
    params.newRefreshTokenExpiresAt,
    params.oldRefreshToken,
  ]);
  return rows[0] ?? null;
};
