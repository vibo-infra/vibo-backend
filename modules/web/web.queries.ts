export const webQueries = {

  // ── Waitlist ────────────────────────────────────────────────────────────────

  findSignupByEmail: `
    SELECT id, email, converted, ref_code_used, signup_position
    FROM waitlist_signups
    WHERE email = $1
    LIMIT 1
  `,

  insertSignup: `
    INSERT INTO waitlist_signups
      (email, city, role, source, utm_source, utm_medium,
       utm_campaign, ref_code_used, referred_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, email, created_at, signup_position
  `,

  /* Totals must count all signups. Do NOT derive total from the city breakdown —
     most signups have city NULL (hero/footer forms), so that subquery was empty → total always 0. */
  getWaitlistCount: `
    WITH totals AS (
      SELECT
        COUNT(*)::int                                           AS total,
        COUNT(*) FILTER (WHERE role = 'attendee')::int          AS attendees,
        COUNT(*) FILTER (WHERE role = 'host')::int              AS hosts
      FROM waitlist_signups
    ),
    by_city_rows AS (
      SELECT city, role, COUNT(*)::int AS city_count
      FROM waitlist_signups
      WHERE city IS NOT NULL
      GROUP BY city, role
    )
    SELECT
      t.total,
      t.attendees,
      t.hosts,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object('city', city, 'count', city_count)
            ORDER BY city_count DESC
          )
          FROM by_city_rows
        ),
        '[]'::json
      ) AS by_city
    FROM totals t
  `,

  updateWaitlistCity: `
    UPDATE waitlist_signups
    SET city = $2
    WHERE email = $1
      AND converted = FALSE
    RETURNING id, city
  `,

  convertSignup: `
    UPDATE waitlist_signups
    SET converted = TRUE, app_user_id = $2
    WHERE email = $1
    RETURNING id
  `,

  getSignupsByCity: `
    SELECT email, id
    FROM waitlist_signups
    WHERE city = $1
      AND converted = FALSE
    ORDER BY created_at ASC
  `,

  getSignupsByReferralCodeUsed: `
    SELECT email, id, city, role, ref_code_used
    FROM waitlist_signups
    WHERE ref_code_used = $1
      AND converted = FALSE
    ORDER BY created_at ASC
  `,

  getAllNonConvertedWaitlist: `
    SELECT email, id, city, role, ref_code_used
    FROM waitlist_signups
    WHERE converted = FALSE
    ORDER BY created_at ASC
  `,

  /** Single signup by email — position = immutable signup_position (same # as UI at join) */
  getWaitlistConfirmationDataByEmail: `
    SELECT
      ws.email,
      ws.city,
      ws.referral_share_code AS referral_code,
      ws.signup_position AS position
    FROM waitlist_signups ws
    WHERE ws.converted = FALSE
      AND LOWER(TRIM(ws.email)) = LOWER(TRIM($1))
    LIMIT 1
  `,

  /** Bulk resend — signup_position matches the # shown when they joined */
  getWaitlistWithReferralForResend: `
    SELECT
      ws.email,
      ws.city,
      ws.referral_share_code AS referral_code,
      ws.signup_position AS position
    FROM waitlist_signups ws
    WHERE ws.converted = FALSE
    ORDER BY ws.signup_position ASC
  `,

  setWaitlistShareCode: `
    UPDATE waitlist_signups
    SET referral_share_code = $1
    WHERE id = $2
    RETURNING referral_share_code AS code
  `,

  getWaitlistShareCodeByOwner: `
    SELECT referral_share_code AS code
    FROM waitlist_signups
    WHERE id = $1
    LIMIT 1
  `,

  /** Lookup waitlist share code (for validation / milestone). */
  findWaitlistShareCode: `
    SELECT
      ws.referral_share_code AS code,
      ws.email AS owner_email,
      ws.id AS owner_id,
      TRUE AS is_active,
      (SELECT COUNT(*)::int FROM waitlist_signups x
       WHERE UPPER(TRIM(x.ref_code_used)) = UPPER(TRIM(ws.referral_share_code))) AS signup_count
    FROM waitlist_signups ws
    WHERE UPPER(TRIM(ws.referral_share_code)) = UPPER(TRIM($1))
    LIMIT 1
  `,

  findOwnerByShareCode: `
    SELECT ws.id AS referred_by_id
    FROM waitlist_signups ws
    WHERE UPPER(TRIM(ws.referral_share_code)) = UPPER(TRIM($1))
    LIMIT 1
  `,

  countSignupsUsingRefCode: `
    SELECT COUNT(*)::int AS c
    FROM waitlist_signups
    WHERE UPPER(TRIM(ref_code_used)) = UPPER(TRIM($1))
  `,

  /** True if code is taken on waitlist or mobile `users.referral_code`. */
  isReferralCodeTaken: `
    SELECT (
      EXISTS (
        SELECT 1 FROM waitlist_signups
        WHERE referral_share_code IS NOT NULL
          AND UPPER(TRIM(referral_share_code)) = UPPER(TRIM($1))
      )
      OR EXISTS (
        SELECT 1 FROM users
        WHERE referral_code IS NOT NULL
          AND UPPER(TRIM(referral_code)) = UPPER(TRIM($1))
      )
    ) AS taken
  `,

  // ── Product content ─────────────────────────────────────────────────────────

  getAllContent: `
    SELECT key, section, value
    FROM product_content
    WHERE is_live = TRUE
    ORDER BY section, key
  `,

  getContentBySection: `
    SELECT key, section, value
    FROM product_content
    WHERE is_live = TRUE
      AND section = $1
    ORDER BY key
  `,

  getContentByKey: `
    SELECT key, section, value
    FROM product_content
    WHERE key = $1
      AND is_live = TRUE
    LIMIT 1
  `,

  // ── FAQs ────────────────────────────────────────────────────────────────────

  getAllFaqs: `
    SELECT id, question, answer, category, ord,
           link_label, link_href, answer_suffix
    FROM web_faqs
    WHERE is_live = TRUE
    ORDER BY ord ASC
  `,

  getFaqsByCategory: `
    SELECT id, question, answer, category, ord,
           link_label, link_href, answer_suffix
    FROM web_faqs
    WHERE is_live = TRUE
      AND category = $1
    ORDER BY ord ASC
  `,

  // ── T&C ─────────────────────────────────────────────────────────────────────

  getTncSections: `
    SELECT
      id, title, content, ord,
      has_highlight, highlight_text,
      last_updated::text AS last_updated
    FROM web_tnc_sections
    ORDER BY ord ASC
  `,

  // ── Help ────────────────────────────────────────────────────────────────────

  getAllHelpArticles: `
    SELECT id, title, category, slug, ord, updated_at
    FROM web_help_articles
    WHERE is_live = TRUE
    ORDER BY category, ord ASC
  `,

  getHelpArticleBySlug: `
    SELECT id, title, content, category, slug, ord, updated_at
    FROM web_help_articles
    WHERE slug = $1
      AND is_live = TRUE
    LIMIT 1
  `,

  getHelpByCategory: `
    SELECT id, title, category, slug, ord, updated_at
    FROM web_help_articles
    WHERE is_live = TRUE
      AND category = $1
    ORDER BY ord ASC
  `,

  // ── Events nearby (same `event` / `location` / `event_category` as events module) ──

  getNearbyEvents: `
    SELECT
      e.event_id                             AS id,
      e.event_name                           AS title,
      c.name                                 AS category,
      COALESCE(NULLIF(TRIM(l.address), ''), l.city, '') AS location,
      l.city,
      e.price,
      e.is_free,
      e.start_time                           AS starts_at
    FROM event e
    JOIN location       l ON l.location_id  = e.location_id
    JOIN event_category c ON c.category_id = e.category_id
    WHERE
      l.city ILIKE $1
      AND e.start_time > NOW()
      AND e.status = 'published'
      AND e.is_private = FALSE
      AND ($2::text IS NULL OR c.name ILIKE $2)
    ORDER BY e.start_time ASC
    LIMIT $3
  `,
};