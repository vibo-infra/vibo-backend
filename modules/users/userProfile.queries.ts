export const GET_USER_PROFILE_ROW = `
  SELECT
    user_id,
    first_name,
    last_name,
    avatar_url,
    bio,
    created_at,
    updated_at
  FROM profile
  WHERE user_id = $1
`;

export const ENSURE_USER_PROFILE_ROW = `
  INSERT INTO profile (user_id, first_name)
  SELECT
    u.user_id,
    COALESCE(NULLIF(trim(split_part(u.email::text, '@', 1)), ''), 'Member')
  FROM users u
  WHERE u.user_id = $1::uuid
    AND NOT EXISTS (SELECT 1 FROM profile p WHERE p.user_id = u.user_id)
`;

export const REPLACE_USER_PROFILE_FIELDS = `
  UPDATE profile
  SET
    first_name = $2,
    last_name = $3,
    avatar_url = $4,
    bio = $5,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING
    user_id,
    first_name,
    last_name,
    avatar_url,
    bio,
    created_at,
    updated_at
`;
