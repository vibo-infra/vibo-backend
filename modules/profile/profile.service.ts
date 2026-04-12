import * as profileRepository from './profile.repository';
import type { ProfileRow } from './profile.repository';

export type PublicProfile = {
  userId: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

function toPublic(row: ProfileRow): PublicProfile {
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export const getProfile = async (userId: string) => {
  const row = await profileRepository.findProfileByUserId(userId);
  if (!row) return null;
  return toPublic(row as ProfileRow);
};

export type PatchProfileInput = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
};

export const updateProfile = async (userId: string, input: PatchProfileInput) => {
  const existing = await profileRepository.findProfileByUserId(userId);
  if (!existing) return null;

  const cur = existing as ProfileRow;
  const firstName =
    input.firstName !== undefined
      ? String(input.firstName ?? '').trim() || cur.first_name
      : cur.first_name;
  const lastName =
    input.lastName !== undefined
      ? input.lastName === null || String(input.lastName).trim() === ''
        ? null
        : String(input.lastName).trim()
      : cur.last_name;
  const avatarUrl =
    input.avatarUrl !== undefined
      ? input.avatarUrl === null || String(input.avatarUrl).trim() === ''
        ? null
        : String(input.avatarUrl).trim()
      : cur.avatar_url;
  const bio =
    input.bio !== undefined
      ? input.bio === null
        ? null
        : String(input.bio)
      : cur.bio;

  const updated = await profileRepository.replaceProfileFields(userId, {
    first_name: firstName,
    last_name: lastName,
    avatar_url: avatarUrl,
    bio,
  });
  if (!updated) return null;
  return toPublic(updated as ProfileRow);
};
