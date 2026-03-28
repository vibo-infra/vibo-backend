export const FIND_USER_BY_EMAIL = `
  SELECT
    user_id,
    email,
    hashed_password,
    is_verified,
    is_active,
    banned_at,
    ban_reason
  FROM users
  WHERE email = $1
`;

export const CREATE_USER = `
  INSERT INTO users (email, hashed_password, accepted_tos_at)
  VALUES ($1, $2, NOW())
  RETURNING
    user_id,
    email,
    is_verified,
    is_active,
    created_at
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