export const FIND_USER_BY_EMAIL = `
  SELECT
    user_id,
    email,
    hashed_password,
    is_verified,
    is_active,
    banned_at,
    ban_reason,
    created_at
  FROM users
  WHERE email = $1
`;

export const CREATE_USER = `
  INSERT INTO users (email, hashed_password, accepted_tos_at, default_city, referred_by_user_id)
  VALUES ($1, $2, NOW(), $3, $4)
  RETURNING
    user_id,
    email,
    is_verified,
    is_active,
    created_at
`;

export const FIND_USER_ID_BY_REFERRAL_CODE = `
  SELECT user_id FROM users
  WHERE referral_code IS NOT NULL
    AND lower(referral_code) = lower(trim($1::text))
  LIMIT 1
`;

export const SET_USER_REFERRAL_CODE = `
  UPDATE users
  SET referral_code = $2, updated_at = NOW()
  WHERE user_id = $1 AND referral_code IS NULL
  RETURNING user_id
`;

export const CREATE_PROFILE = `
  INSERT INTO profile (user_id, first_name)
  VALUES ($1, $2)
  ON CONFLICT (user_id) DO NOTHING
`;

export const CREATE_SESSION = `
  INSERT INTO session (
    user_id,
    token,
    refresh_token,
    device_info,
    ip_address,
    expires_at,
    refresh_token_expires_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING session_id, token, refresh_token, expires_at, refresh_token_expires_at
`;

export const DELETE_SESSION_BY_TOKEN = `
  DELETE FROM session
  WHERE token = $1
`;

export const FIND_SESSION_BY_TOKEN = `
  SELECT
    s.session_id,
    s.user_id,
    s.expires_at,
    u.is_active,
    u.banned_at
  FROM session s
  JOIN users u ON u.user_id = s.user_id
  WHERE s.token = $1
    AND s.expires_at > NOW()
`;

// REFRESH TOKEN QUERIES

export const FIND_SESSION_BY_REFRESH_TOKEN = `
  SELECT
    s.session_id,
    s.user_id,
    s.refresh_token_expires_at,
    u.is_active,
    u.banned_at,
    u.email
  FROM session s
  JOIN users u ON u.user_id = s.user_id
  WHERE s.refresh_token = $1
    AND s.refresh_token_expires_at > NOW()
`;

export const ROTATE_SESSION_TOKENS = `
  UPDATE session
  SET
    token            = $1,
    refresh_token    = $2,
    expires_at       = $3,
    refresh_token_expires_at = $4
  WHERE refresh_token = $5
  RETURNING session_id, token, refresh_token, expires_at, refresh_token_expires_at
`;