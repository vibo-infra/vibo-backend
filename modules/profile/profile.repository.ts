import { pool } from '../../core/database/client';
import { GET_PROFILE, REPLACE_PROFILE_FIELDS } from './profile.queries';

export const findProfileByUserId = async (userId: string) => {
  const { rows } = await pool.query(GET_PROFILE, [userId]);
  return rows[0] ?? null;
};

export type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
};

export const replaceProfileFields = async (userId: string, row: Omit<ProfileRow, 'user_id' | 'created_at' | 'updated_at'>) => {
  const { rows } = await pool.query(REPLACE_PROFILE_FIELDS, [
    userId,
    row.first_name,
    row.last_name,
    row.avatar_url,
    row.bio,
  ]);
  return rows[0] ?? null;
};
