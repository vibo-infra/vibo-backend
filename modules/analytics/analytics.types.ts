// source: where the event came from
// 'web'    — landing page
// 'app'    — mobile app (future)
// 'admin'  — internal tooling (future)

export type AnalyticsSource = 'web' | 'app' | 'admin';

export interface InsertAnalyticsEvent {
  sessionId:   string;
  source:      AnalyticsSource;
  eventType:   string;
  element:     string | null;
  page:        string | null;
  entityType:  string | null;
  entityId:    string | null;
  userId:      string | null;
  utmSource:   string | null;
  utmCampaign: string | null;
  city:        string | null;
  metadata:    Record<string, unknown> | null;
  clientTs:    Date | null;
}

export interface TrackInput {
  session_id:  string;
  source?:     AnalyticsSource;
  events: {
    event_type:   string;
    element?:     string;
    page?:        string;
    entity_type?: string;
    entity_id?:   string;
    user_id?:     string;
    utm_source?:  string;
    utm_campaign?: string;
    city?:        string;
    metadata?:    Record<string, unknown>;
    ts?:          number;
  }[];
}

export interface AnalyticsSummary {
  total_events:   number;
  total_sessions: number;
  by_type:        { event_type: string; count: number }[];
  by_source:      { source: string; count: number }[];
  top_elements:   { element: string; count: number }[];
}