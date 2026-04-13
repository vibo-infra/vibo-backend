import { pool } from '../../core/database/client';
import {
  GET_USER_PROFILE_ROW,
  REPLACE_USER_PROFILE_FIELDS,
  ENSURE_USER_PROFILE_ROW,
} from './userProfile.queries';

export type UserProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
};

export const findUserProfileByUserId = async (userId: string) => {
  const { rows } = await pool.query(GET_USER_PROFILE_ROW, [userId]);
  return rows[0] ?? null;
};

/** Creates a `profile` row from `users.email` when missing (legacy accounts). */
export const ensureUserProfileRow = async (userId: string) => {
  await pool.query(ENSURE_USER_PROFILE_ROW, [userId]);
};

export const replaceUserProfileFields = async (
  userId: string,
  row: Omit<UserProfileRow, 'user_id' | 'created_at' | 'updated_at'>,
) => {
  const { rows } = await pool.query(REPLACE_USER_PROFILE_FIELDS, [
    userId,
    row.first_name,
    row.last_name,
    row.avatar_url,
    row.bio,
  ]);
  return rows[0] ?? null;
};
