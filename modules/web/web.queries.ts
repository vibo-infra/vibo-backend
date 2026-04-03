export const webQueries = {

  // ── Waitlist ────────────────────────────────────────────────────────────────

  findSignupByEmail: `
    SELECT id, email, converted, ref_code_used
    FROM waitlist_signups
    WHERE email = $1
    LIMIT 1
  `,

  insertSignup: `
    INSERT INTO waitlist_signups
      (email, city, role, source, utm_source, utm_medium,
       utm_campaign, ref_code_used, referred_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, email, created_at
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

  // ── Referral ────────────────────────────────────────────────────────────────

  insertReferralCode: `
    INSERT INTO referral_codes (code, owner_id)
    VALUES ($1, $2)
    RETURNING code
  `,

  getReferralCodeByOwner: `
    SELECT code
    FROM referral_codes
    WHERE owner_id = $1
    LIMIT 1
  `,

  findReferralCode: `
    SELECT
      rc.code,
      rc.click_count,
      rc.signup_count,
      rc.is_active,
      ws.email   AS owner_email,
      ws.id      AS owner_id
    FROM referral_codes rc
    JOIN waitlist_signups ws ON ws.id = rc.owner_id
    WHERE rc.code = $1
    LIMIT 1
  `,

  findOwnerByReferralCode: `
    SELECT ws.id AS referred_by_id
    FROM referral_codes rc
    JOIN waitlist_signups ws ON ws.id = rc.owner_id
    WHERE rc.code = $1
      AND rc.is_active = TRUE
    LIMIT 1
  `,

  incrementReferralClick: `
    UPDATE referral_codes
    SET click_count = click_count + 1
    WHERE code = $1
  `,

  incrementReferralSignup: `
    UPDATE referral_codes
    SET signup_count = signup_count + 1
    WHERE code = $1
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