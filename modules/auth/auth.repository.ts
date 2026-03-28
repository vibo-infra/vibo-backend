// The repository is the only file that imports pool. 
// It executes queries and returns raw data. No business logic here 
// — just database calls.

import { pool } from '../../core/database/client';
import {
  FIND_USER_BY_EMAIL,
  CREATE_USER,
  CREATE_SESSION,
  DELETE_SESSION_BY_TOKEN,
  FIND_SESSION_BY_TOKEN,
  ROTATE_SESSION_TOKENS,
  FIND_SESSION_BY_REFRESH_TOKEN,
} from './auth.queries';

export const findUserByEmail = async (email: string) => {
  const { rows } = await pool.query(FIND_USER_BY_EMAIL, [email]);
  return rows[0] ?? null;
};

export const createUser = async (
  email: string,
  hashedPassword: string
) => {
  const { rows } = await pool.query(CREATE_USER, [email, hashedPassword]);
  return rows[0];
};

export const createSession = async (params: {
  userId: string;
  token: string;
  refreshToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  refreshTokenExpiresAt: Date;
}) => {
  const { rows } = await pool.query(CREATE_SESSION, [
    params.userId,
    params.token,
    params.refreshToken,
    params.deviceInfo,
    params.ipAddress,
    params.expiresAt,
    params.refreshTokenExpiresAt,
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