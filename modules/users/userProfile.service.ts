import * as userProfileRepository from './userProfile.repository';
import type { UserProfileRow } from './userProfile.repository';

export type PublicUserProfile = {
  userId: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

function toPublic(row: UserProfileRow): PublicUserProfile {
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

export const getUserProfile = async (userId: string) => {
  await userProfileRepository.ensureUserProfileRow(userId);
  const row = await userProfileRepository.findUserProfileByUserId(userId);
  if (!row) return null;
  return toPublic(row as UserProfileRow);
};

export type PatchUserProfileInput = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
};

export const updateUserProfile = async (userId: string, input: PatchUserProfileInput) => {
  await userProfileRepository.ensureUserProfileRow(userId);
  const existing = await userProfileRepository.findUserProfileByUserId(userId);
  if (!existing) return null;

  const cur = existing as UserProfileRow;
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

  const updated = await userProfileRepository.replaceUserProfileFields(userId, {
    first_name: firstName,
    last_name: lastName,
    avatar_url: avatarUrl,
    bio,
  });
  if (!updated) return null;
  return toPublic(updated as UserProfileRow);
};
