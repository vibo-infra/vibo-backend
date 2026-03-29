// All SQL lives here. Nothing else in the module touches SQL strings.

export const analyticsQueries = {

  bulkInsert: (count: number): string => {
    const rows = Array.from({ length: count }, (_, i) => {
      const b = i * 13;
      return (
        `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},` +
        `$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13})`
      );
    }).join(', ');

    return `
      INSERT INTO analytics_events (
        session_id, source, event_type, element, page,
        entity_type, entity_id, user_id,
        utm_source, utm_campaign, city, metadata, client_ts
      ) VALUES ${rows}
    `;
  },

  getSummary: `
    SELECT
      COUNT(*)::int                                        AS total_events,
      COUNT(DISTINCT session_id)::int                      AS total_sessions,
      json_agg(
        json_build_object('event_type', et, 'count', ec)
        ORDER BY ec DESC
      )                                                    AS by_type,
      json_agg(
        json_build_object('source', src, 'count', sc)
        ORDER BY sc DESC
      )                                                    AS by_source
    FROM (
      SELECT
        event_type AS et, COUNT(*) AS ec
      FROM analytics_events
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY event_type
    ) t1,
    (
      SELECT
        source AS src, COUNT(*) AS sc
      FROM analytics_events
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY source
    ) t2,
    (
      SELECT COUNT(*) FROM analytics_events WHERE created_at BETWEEN $1 AND $2
    ) total,
    (
      SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE created_at BETWEEN $1 AND $2
    ) sessions
  `,

  getTopElements: `
    SELECT
      element,
      COUNT(*)::int AS count
    FROM analytics_events
    WHERE
      event_type  = 'cta_click'
      AND element IS NOT NULL
      AND created_at BETWEEN $1 AND $2
    GROUP BY element
    ORDER BY count DESC
    LIMIT 10
  `,

  getScrollDepth: `
    SELECT
      (metadata->>'depth')::int AS depth,
      COUNT(*)::int             AS count
    FROM analytics_events
    WHERE
      event_type  = 'scroll_depth'
      AND created_at BETWEEN $1 AND $2
    GROUP BY depth
    ORDER BY depth
  `,

  getConversionsBySource: `
    SELECT
      ae.utm_source              AS source,
      COUNT(DISTINCT ae.session_id)::int  AS sessions,
      COUNT(ws.id)::int          AS signups
    FROM analytics_events ae
    LEFT JOIN waitlist_signups ws
      ON ws.utm_source = ae.utm_source
      AND ws.created_at BETWEEN $1 AND $2
    WHERE ae.created_at BETWEEN $1 AND $2
    GROUP BY ae.utm_source
    ORDER BY signups DESC
  `,
};