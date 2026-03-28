// The service contains all business logic. 
// It decides what to do — the repository just does the database work. 
// The service never touches pool directly.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authRepository from './auth.repository';
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 30;

export const register = async (params: { email: string; password: string }) => {
  const existing = await authRepository.findUserByEmail(params.email);
  if (existing) throw new Error('EMAIL_ALREADY_EXISTS');

  const hashedPassword = await bcrypt.hash(params.password, SALT_ROUNDS);
  const user = await authRepository.createUser(params.email, hashedPassword);

  // Generate tokens exactly like login does
  const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } =
    generateTokens(user.user_id, user.email);

  const session = await authRepository.createSession({
    userId: user.user_id,
    token: accessToken,
    refreshToken,
    deviceInfo: null,
    ipAddress: null,
    expiresAt: accessExpiresAt,
    refreshTokenExpiresAt: refreshExpiresAt,
  });

  return {
    accessToken: session.token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      userId: user.user_id,
      email: user.email,
      isVerified: user.is_verified,
    },
  };
};


// Replace your existing generateTokens logic inside login()
const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_MINUTES}m` }
  );

  // Refresh token is just a random string — not a JWT
  // It has no meaning on its own, validity is checked against the DB
  const refreshToken = crypto.randomBytes(64).toString('hex');

  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_MINUTES * 60 * 1000);
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
};

export const login = async (params: {
  email: string;
  password: string;
  deviceInfo: string | null;
  ipAddress: string | null;
}) => {
  const user = await authRepository.findUserByEmail(params.email);
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (!user.is_active || user.banned_at) throw new Error('ACCOUNT_BANNED');

  const passwordMatch = await bcrypt.compare(params.password, user.hashed_password);
  if (!passwordMatch) throw new Error('INVALID_CREDENTIALS');

  const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } =
    generateTokens(user.user_id, user.email);

  const session = await authRepository.createSession({
    userId: user.user_id,
    token: accessToken,
    refreshToken,
    deviceInfo: params.deviceInfo,
    ipAddress: params.ipAddress,
    expiresAt: accessExpiresAt,
    refreshTokenExpiresAt: refreshExpiresAt,
  });

  return {
    accessToken: session.token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      userId: user.user_id,
      email: user.email,
      isVerified: user.is_verified,
    },
  };
};

// New: refresh endpoint logic
export const refresh = async (incomingRefreshToken: string) => {
  const session = await authRepository.findSessionByRefreshToken(
    incomingRefreshToken
  );

  if (!session) throw new Error('INVALID_REFRESH_TOKEN');
  if (!session.is_active || session.banned_at) throw new Error('ACCOUNT_BANNED');

  // Rotate both tokens — old refresh token is now dead
  // This is called refresh token rotation — if a stolen token is used,
  // the legitimate user's next refresh will fail and you'll know
  const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } =
    generateTokens(session.user_id, session.email);

  const updated = await authRepository.rotateSessionTokens({
    newToken: accessToken,
    newRefreshToken: refreshToken,
    newExpiresAt: accessExpiresAt,
    newRefreshTokenExpiresAt: refreshExpiresAt,
    oldRefreshToken: incomingRefreshToken,
  });

  if (!updated) throw new Error('INVALID_REFRESH_TOKEN');

  return {
    accessToken: updated.token,
    refreshToken: updated.refresh_token,
    expiresAt: updated.expires_at,
  };
};

export const logout = async (token: string) => {
  await authRepository.deleteSessionByToken(token);
};