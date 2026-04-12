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
    ) AS distance_km

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

/** Host's upcoming events (published or draft). Registered list is empty until registrations exist. */
export const LIST_MY_UPCOMING_HOSTED_EVENTS = `
  SELECT
    e.event_id,
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
    l.latitude,
    l.longitude,
    c.name        AS category_name,
    c.icon_url    AS category_icon,
    p.first_name  AS host_first_name,
    p.avatar_url  AS host_avatar,
    NULL::numeric AS distance_km
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
    l.address, l.city, l.state, l.latitude, l.longitude,
    l.address AS place_name,
    c.name AS category_name, c.icon_url AS category_icon,
    p.first_name AS host_first_name, p.avatar_url AS host_avatar
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
  INSERT INTO attendee_review (event_id, reviewer_id, rating, comment)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (event_id, reviewer_id)
  DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    updated_at = NOW()
  RETURNING *
`;

export const LIST_EVENT_REVIEWS = `
  SELECT
    r.review_id,
    r.event_id,
    r.reviewer_id,
    r.rating,
    r.comment,
    r.created_at,
    p.first_name AS reviewer_first_name
  FROM attendee_review r
  JOIN profile p ON p.user_id = r.reviewer_id
  WHERE r.event_id = $1
  ORDER BY r.created_at DESC
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