export const GET_AUTH_USER_PAYLOAD = `
  SELECT
    u.user_id,
    u.email,
    u.is_verified,
    COALESCE(w.balance, u.spark_balance, 0)::bigint AS spark_balance,
    u.default_city,
    u.unlimited_hosting_until,
    u.push_notifications_enabled,
    u.in_app_notifications_enabled,
    u.waitlist_tier,
    u.waitlist_hosting_discount_until,
    u.spark_welcome_paid_hostings_used,
    u.referral_code,
    u.app_preferences,
    p.first_name
  FROM users u
  LEFT JOIN spark_wallet w ON w.user_id = u.user_id
  LEFT JOIN profile p ON p.user_id = u.user_id
  WHERE u.user_id = $1
`;

export const PATCH_USER_PROFILE = `
  UPDATE users u
  SET
    default_city = COALESCE($2, u.default_city),
    push_notifications_enabled = COALESCE($3, u.push_notifications_enabled),
    in_app_notifications_enabled = COALESCE($4, u.in_app_notifications_enabled),
    updated_at = NOW()
  WHERE u.user_id = $1
  RETURNING
    u.user_id,
    u.email,
    u.is_verified,
    (SELECT COALESCE(w.balance, u.spark_balance, 0)::bigint FROM spark_wallet w WHERE w.user_id = u.user_id) AS spark_balance,
    u.default_city,
    u.unlimited_hosting_until,
    u.push_notifications_enabled,
    u.in_app_notifications_enabled
`;

export const PATCH_PROFILE_NAME = `
  UPDATE profile
  SET
    first_name = COALESCE(NULLIF(trim($2), ''), first_name),
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING first_name
`;

export const MERGE_USER_APP_PREFERENCES = `
  UPDATE users
  SET
    app_preferences = COALESCE(app_preferences, '{}'::jsonb) || $2::jsonb,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING user_id
`;

export const LOCK_USER_FOR_GRANTS = `
  SELECT
    u.user_id,
    u.email,
    u.created_at,
    u.waitlist_spark_bonus_at,
    u.regular_login_spark_grant_at
  FROM users u
  WHERE u.user_id = $1
  FOR UPDATE OF u
`;

export const GET_WAITLIST_SIGNUP_FOR_EMAIL = `
  SELECT signup_position, created_at
  FROM waitlist_signups
  WHERE lower(trim(email)) = lower(trim($1::text))
  LIMIT 1
`;

export const CLAIM_WAITLIST_TIER_BUNDLE = `
  UPDATE users
  SET
    waitlist_spark_bonus_at = NOW(),
    waitlist_tier = $2,
    waitlist_hosting_discount_until = $3,
    updated_at = NOW()
  WHERE user_id = $1
    AND waitlist_spark_bonus_at IS NULL
  RETURNING user_id
`;

export const CLAIM_REGULAR_LOGIN_SPARK_GRANT = `
  UPDATE users
  SET
    regular_login_spark_grant_at = NOW(),
    updated_at = NOW()
  WHERE user_id = $1
    AND regular_login_spark_grant_at IS NULL
  RETURNING user_id
`;

export const INCREMENT_SPARK_WELCOME_PAID_HOSTINGS = `
  UPDATE users
  SET
    spark_welcome_paid_hostings_used = spark_welcome_paid_hostings_used + 1,
    updated_at = NOW()
  WHERE user_id = $1
    AND spark_welcome_paid_hostings_used < $2
  RETURNING spark_welcome_paid_hostings_used
`;

export const APPLY_HOSTING_PROMO_BACKFILL = `
  UPDATE users u
  SET
    unlimited_hosting_until = $2,
    updated_at = NOW()
  WHERE u.user_id = $1
    AND u.unlimited_hosting_until IS NULL
    AND $2::timestamptz IS NOT NULL
    AND $3::timestamptz IS NOT NULL
    AND u.created_at < $3::timestamptz
  RETURNING u.user_id
`;

export const GET_USER_HOSTING_ROW_FOR_UPDATE = `
  SELECT
    u.user_id,
    u.email,
    u.is_verified,
    COALESCE(w.balance, u.spark_balance, 0)::bigint AS spark_balance,
    u.unlimited_hosting_until,
    u.created_at,
    u.is_active,
    u.banned_at,
    u.identity_verified_at,
    u.waitlist_tier,
    u.waitlist_hosting_discount_until,
    u.spark_welcome_paid_hostings_used
  FROM users u
  LEFT JOIN spark_wallet w ON w.user_id = u.user_id
  WHERE u.user_id = $1
  FOR UPDATE OF u
`;

