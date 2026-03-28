export const CREATE_LOCATION = `
  INSERT INTO location (address, city, state, country, pincode, latitude, longitude, place_name)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

    -- Location details
    l.place_name,
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

  ORDER BY distance_km ASC, e.start_time ASC

  LIMIT  $4
  OFFSET $5
`;

export const GET_EVENT_BY_ID = `
  SELECT
    e.*,
    l.address, l.city, l.state, l.latitude, l.longitude, l.place_name,
    c.name AS category_name, c.icon_url AS category_icon,
    p.first_name AS host_first_name, p.avatar_url AS host_avatar
  FROM event e
  JOIN location       l ON l.location_id  = e.location_id
  JOIN event_category c ON c.category_id  = e.category_id
  JOIN profile        p ON p.user_id      = e.host_id
  WHERE e.event_id = $1
`;