export const GET_PROFILE = `
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

export const REPLACE_PROFILE_FIELDS = `
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
