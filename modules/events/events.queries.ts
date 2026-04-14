export const CREATE_LOCATION = `
  INSERT INTO location (address, city, state, country, pincode, latitude, longitude)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *
`;

export const CREATE_EVENT = `
  INSERT INTO event (
    host_id,
    category_id,
    location_id,
    event_name,
    event_description,
    cover_image_url,
    start_time,
    end_time,
    capacity,
    is_free,
    price,
    requires_approval,
    is_private,
    audience_type,
    status
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
  RETURNING *
`;

export const GET_EVENTS_BY_LOCATION = `
  SELECT
    e.event_id,
    e.host_id,
    e.event_name,
    e.event_description,
    e.cover_image_url,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price,
    e.capacity,
    e.current_attendee_count,
    e.requires_approval,
    e.status,
    e.audience_type,

    -- Location details (no place_name column — use address)
    l.address   AS place_name,
    l.city,
    l.country,
    l.latitude,
    l.longitude,

    -- Category
    c.name        AS category_name,
    c.icon_url    AS category_icon,

    -- Host
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,

    -- Distance from user in km
    ROUND(
      (6371 * acos(
        cos(radians($1)) * cos(radians(l.latitude))
        * cos(radians(l.longitude) - radians($2))
        + sin(radians($1)) * sin(radians(l.latitude))
      ))::numeric, 2
    ) AS distance_km,

    CASE
      WHEN $8::uuid IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM event_like el
        WHERE el.event_id = e.event_id AND el.user_id = $8::uuid
      )
    END AS liked_by_me,
    CASE
      WHEN $8::uuid IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM event_registration er
        WHERE er.event_id = e.event_id AND er.user_id = $8::uuid AND er.status = 'registered'
      )
    END AS is_registered_by_me,
    (SELECT COUNT(*)::int FROM event_like elc WHERE elc.event_id = e.event_id) AS like_count

  FROM event e
  JOIN location      l ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id = e.category_id
  JOIN profile       p ON p.user_id      = e.host_id

  WHERE
    e.status      = 'published'
    AND e.is_private = FALSE
    AND e.start_time > NOW()

    -- Only events within radius_km of the user's point
    AND (
      6371 * acos(
        cos(radians($1)) * cos(radians(l.latitude))
        * cos(radians(l.longitude) - radians($2))
        + sin(radians($1)) * sin(radians(l.latitude))
      )
    ) <= $3
    AND ($6::text IS NULL OR TRIM($6) = '' OR LOWER(TRIM(l.city)) = LOWER(TRIM($6)))
    AND ($7::uuid IS NULL OR e.category_id = $7)

  ORDER BY distance_km ASC, e.start_time ASC

  LIMIT  $4
  OFFSET $5
`;

export const DELETE_EVENT_LIKE = `
  DELETE FROM event_like
  WHERE event_id = $1::uuid AND user_id = $2::uuid
  RETURNING event_id
`;

export const INSERT_EVENT_LIKE = `
  INSERT INTO event_like (event_id, user_id)
  VALUES ($1::uuid, $2::uuid)
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING event_id
`;

/** Host's upcoming events (published or draft). Registered list is empty until registrations exist. */
export const LIST_MY_UPCOMING_HOSTED_EVENTS = `
  SELECT
    e.event_id,
    e.host_id,
    e.event_name,
    e.event_description,
    e.cover_image_url,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price,
    e.capacity,
    e.current_attendee_count,
    e.requires_approval,
    e.status,
    e.audience_type,
    l.address   AS place_name,
    l.city,
    l.country,
    l.latitude,
    l.longitude,
    c.name        AS category_name,
    c.icon_url    AS category_icon,
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,
    NULL::numeric AS distance_km,
    (SELECT COUNT(*)::int FROM event_like el WHERE el.event_id = e.event_id) AS like_count,
    EXISTS (
      SELECT 1 FROM event_like el2
      WHERE el2.event_id = e.event_id AND el2.user_id = $1::uuid
    ) AS liked_by_me,
    EXISTS (
      SELECT 1 FROM event_registration er
      WHERE er.event_id = e.event_id AND er.user_id = $1::uuid AND er.status = 'registered'
    ) AS is_registered_by_me
  FROM event e
  JOIN location      l ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id = e.category_id
  JOIN profile       p ON p.user_id      = e.host_id
  WHERE e.host_id = $1
    AND e.start_time > NOW()
    AND e.status IN ('published', 'draft')
  ORDER BY e.start_time ASC
  LIMIT 50
`;

export const GET_EVENT_BY_ID = `
  SELECT
    e.*,
    l.address, l.city, l.state, l.country, l.latitude, l.longitude,
    l.address AS place_name,
    c.name AS category_name, c.icon_url AS category_icon,
    p.first_name AS host_first_name, p.avatar_url AS host_avatar,
    CASE
      WHEN $2::uuid IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM event_like el
        WHERE el.event_id = e.event_id AND el.user_id = $2::uuid
      )
    END AS liked_by_me,
    CASE
      WHEN $2::uuid IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM event_registration er
        WHERE er.event_id = e.event_id AND er.user_id = $2::uuid AND er.status = 'registered'
      )
    END AS is_registered_by_me,
    (SELECT COUNT(*)::int FROM event_like elc WHERE elc.event_id = e.event_id) AS like_count
  FROM event e
  JOIN location       l ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id  = e.category_id
  JOIN profile        p ON p.user_id      = e.host_id
  WHERE e.event_id = $1
`;

export const LIST_EVENT_CATEGORIES = `
  SELECT category_id, name, icon_url, display_order
  FROM event_category
  WHERE is_active = TRUE
  ORDER BY display_order ASC, name ASC
`;

export const GET_EVENT_HOST_ID = `
  SELECT host_id FROM event WHERE event_id = $1
`;

export const UPSERT_EVENT_REVIEW = `
  INSERT INTO attendee_review (event_id, reviewer_id, rating, comment, peer_rating)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (event_id, reviewer_id)
  DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    peer_rating = EXCLUDED.peer_rating,
    updated_at = NOW()
  RETURNING *
`;

export const LIST_EVENT_REVIEWS = `
  SELECT
    r.review_id,
    r.event_id,
    r.reviewer_id,
    r.rating,
    r.peer_rating,
    r.comment,
    r.created_at,
    p.first_name AS reviewer_first_name
  FROM attendee_review r
  JOIN profile p ON p.user_id = r.reviewer_id
  WHERE r.event_id = $1
  ORDER BY r.created_at DESC
`;

export const LIST_MY_REGISTERED_UPCOMING_EVENTS = `
  SELECT
    e.event_id,
    e.host_id,
    e.event_name,
    e.event_description,
    e.cover_image_url,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price,
    e.capacity,
    e.current_attendee_count,
    e.requires_approval,
    e.status,
    e.audience_type,
    l.address   AS place_name,
    l.city,
    l.country,
    l.latitude,
    l.longitude,
    c.name        AS category_name,
    c.icon_url    AS category_icon,
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,
    NULL::numeric AS distance_km,
    (SELECT COUNT(*)::int FROM event_like el WHERE el.event_id = e.event_id) AS like_count,
    true AS is_registered_by_me,
    EXISTS (
      SELECT 1 FROM event_like el2
      WHERE el2.event_id = e.event_id AND el2.user_id = $1::uuid
    ) AS liked_by_me
  FROM event_registration er
  JOIN event e         ON e.event_id     = er.event_id
  JOIN location l      ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id = e.category_id
  JOIN profile p       ON p.user_id      = e.host_id
  WHERE er.user_id = $1::uuid
    AND er.status = 'registered'
    AND e.start_time > NOW()
    AND e.status = 'published'
  ORDER BY e.start_time ASC
  LIMIT 50
`;

export const LIST_MY_PAST_HOSTED_EVENTS = `
  SELECT
    e.event_id,
    e.host_id,
    e.event_name,
    e.event_description,
    e.cover_image_url,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price,
    e.capacity,
    e.current_attendee_count,
    e.requires_approval,
    e.status,
    e.audience_type,
    l.address   AS place_name,
    l.city,
    l.country,
    l.latitude,
    l.longitude,
    c.name        AS category_name,
    c.icon_url    AS category_icon,
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,
    NULL::numeric AS distance_km,
    (SELECT COUNT(*)::int FROM event_like el WHERE el.event_id = e.event_id) AS like_count,
    EXISTS (
      SELECT 1 FROM event_like el2
      WHERE el2.event_id = e.event_id AND el2.user_id = $1::uuid
    ) AS liked_by_me,
    EXISTS (
      SELECT 1 FROM event_registration er
      WHERE er.event_id = e.event_id AND er.user_id = $1::uuid AND er.status = 'registered'
    ) AS is_registered_by_me
  FROM event e
  JOIN location      l ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id = e.category_id
  JOIN profile       p ON p.user_id      = e.host_id
  WHERE e.host_id = $1::uuid
    AND e.start_time <= NOW()
    AND e.status IN ('published', 'cancelled')
  ORDER BY e.start_time DESC
  LIMIT 100
`;

export const LIST_MY_REGISTERED_PAST_EVENTS = `
  SELECT
    e.event_id,
    e.host_id,
    e.event_name,
    e.event_description,
    e.cover_image_url,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price,
    e.capacity,
    e.current_attendee_count,
    e.requires_approval,
    e.status,
    e.audience_type,
    l.address   AS place_name,
    l.city,
    l.country,
    l.latitude,
    l.longitude,
    c.name        AS category_name,
    c.icon_url    AS category_icon,
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,
    NULL::numeric AS distance_km,
    (SELECT COUNT(*)::int FROM event_like el WHERE el.event_id = e.event_id) AS like_count,
    true AS is_registered_by_me,
    EXISTS (
      SELECT 1 FROM event_like el2
      WHERE el2.event_id = e.event_id AND el2.user_id = $1::uuid
    ) AS liked_by_me
  FROM event_registration er
  JOIN event e         ON e.event_id     = er.event_id
  JOIN location l      ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id = e.category_id
  JOIN profile p       ON p.user_id      = e.host_id
  WHERE er.user_id = $1::uuid
    AND er.status = 'registered'
    AND e.start_time <= NOW()
    AND e.status IN ('published', 'cancelled')
  ORDER BY e.start_time DESC
  LIMIT 100
`;

export const LOCK_EVENT_FOR_REGISTRATION = `
  SELECT
    e.event_id,
    e.host_id,
    e.capacity,
    e.current_attendee_count,
    e.status,
    e.start_time
  FROM event e
  WHERE e.event_id = $1::uuid
  FOR UPDATE
`;

export const INSERT_EVENT_REGISTRATION = `
  INSERT INTO event_registration (event_id, user_id, status)
  VALUES ($1::uuid, $2::uuid, 'registered')
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING event_id
`;

export const INCREMENT_EVENT_ATTENDEE_COUNT = `
  UPDATE event
  SET current_attendee_count = current_attendee_count + 1, updated_at = NOW()
  WHERE event_id = $1::uuid
`;

export const CANCEL_EVENT_BY_HOST = `
  UPDATE event
  SET
    status = 'cancelled',
    cancellation_reason = COALESCE(cancellation_reason, 'host_deleted'),
    updated_at = NOW()
  WHERE event_id = $1::uuid
    AND host_id = $2::uuid
    AND start_time > NOW() + INTERVAL '24 hours'
    AND status IN ('published', 'draft')
  RETURNING event_id
`;

export const EVENT_REVIEW_ELIGIBILITY = `
  SELECT
    e.host_id,
    EXISTS (
      SELECT 1 FROM event_registration er
      WHERE er.event_id = e.event_id AND er.user_id = $2::uuid AND er.status = 'registered'
    ) AS is_registered,
    (COALESCE(e.end_time, e.start_time + INTERVAL '1 hour') < NOW()) AS event_ended
  FROM event e
  WHERE e.event_id = $1::uuid
`;

export const HOST_PUBLIC_AGG = `
  SELECT
    p.first_name,
    p.last_name,
    (u.identity_verified_at IS NOT NULL) AS is_verified,
    (
      SELECT COUNT(*)::int FROM event e2
      WHERE e2.host_id = $1::uuid
        AND e2.status = 'published'
        AND e2.start_time < NOW()
    ) AS past_hosted_count,
    (
      SELECT AVG(ar.rating)::numeric
      FROM attendee_review ar
      JOIN event e3 ON e3.event_id = ar.event_id
      WHERE e3.host_id = $1::uuid AND ar.rating IS NOT NULL
    ) AS avg_host_rating,
    (
      SELECT COUNT(*)::int FROM attendee_review ar
      JOIN event e3 ON e3.event_id = ar.event_id
      WHERE e3.host_id = $1::uuid
    ) AS review_count
  FROM users u
  JOIN profile p ON p.user_id = u.user_id
  WHERE u.user_id = $1::uuid
`;

export const LIST_PAST_HOSTED_EVENTS_WITH_STATS = `
  SELECT
    e.event_id,
    e.host_id,
    e.event_name,
    e.event_description,
    e.cover_image_url,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price,
    e.capacity,
    e.current_attendee_count,
    e.requires_approval,
    e.status,
    e.audience_type,
    l.address   AS place_name,
    l.city,
    l.country,
    l.latitude,
    l.longitude,
    c.name        AS category_name,
    c.icon_url    AS category_icon,
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,
    (SELECT COUNT(*)::int FROM event_like el WHERE el.event_id = e.event_id) AS like_count,
    (SELECT COUNT(*)::int FROM attendee_review ar WHERE ar.event_id = e.event_id) AS review_count,
    (
      SELECT AVG(ar.rating)::numeric
      FROM attendee_review ar
      WHERE ar.event_id = e.event_id AND ar.rating IS NOT NULL
    ) AS avg_rating
  FROM event e
  JOIN location      l ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id = e.category_id
  JOIN profile       p ON p.user_id      = e.host_id
  WHERE e.host_id = $1::uuid
    AND e.status = 'published'
    AND e.start_time < NOW()
  ORDER BY e.start_time DESC
  LIMIT 30
`;

/** Pre-launch: must appear on waitlist; optional signup deadline via early_access_cutoff_at. */
export const CHECK_WAITLIST_HOSTING_ELIGIBILITY = `
  SELECT EXISTS (
    SELECT 1
    FROM waitlist_signups w
    WHERE lower(trim(w.email)) = lower(trim($1::text))
      AND ($2::timestamptz IS NULL OR w.created_at <= $2::timestamptz)
  ) AS eligible
`;