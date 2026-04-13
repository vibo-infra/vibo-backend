export const INSERT_NOTIFICATION = `
  INSERT INTO notification (user_id, title, body, data)
  VALUES ($1, $2, $3, $4::jsonb)
  RETURNING *
`;

export const LIST_NOTIFICATIONS = `
  SELECT notification_id, user_id, title, body, data, read_at, created_at
  FROM notification
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`;

export const MARK_NOTIFICATION_READ = `
  UPDATE notification
  SET read_at = COALESCE(read_at, NOW())
  WHERE notification_id = $1 AND user_id = $2
  RETURNING notification_id
`;

export const MARK_ALL_NOTIFICATIONS_READ = `
  UPDATE notification
  SET read_at = COALESCE(read_at, NOW())
  WHERE user_id = $1 AND read_at IS NULL
`;

export const DELETE_NOTIFICATION_FOR_USER = `
  DELETE FROM notification
  WHERE notification_id = $1 AND user_id = $2
  RETURNING notification_id
`;

export const UPSERT_PUSH_TOKEN = `
  INSERT INTO user_push_token (user_id, token, platform, updated_at)
  VALUES ($1, $2, $3, NOW())
  ON CONFLICT (user_id, token)
  DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()
  RETURNING id
`;

export const LIST_PUSH_TOKENS_FOR_USER = `
  SELECT token, platform FROM user_push_token WHERE user_id = $1
`;

export const DELETE_PUSH_TOKEN_FOR_USER = `
  DELETE FROM user_push_token WHERE user_id = $1 AND token = $2
`;

export const DELETE_PUSH_TOKENS_BY_VALUE = `
  DELETE FROM user_push_token WHERE token = ANY($1::text[])
`;

/** Dedupe nudges: `data` must be a JSON object subset, e.g. {"type":"verification","focus":"email"}. */
export const COUNT_NOTIFICATIONS_DATA_CONTAINS_SINCE_DAYS = `
  SELECT COUNT(*)::int AS c
  FROM notification
  WHERE user_id = $1
    AND data IS NOT NULL
    AND data @> $2::jsonb
    AND created_at > NOW() - ($3::double precision * INTERVAL '1 day')
`;
