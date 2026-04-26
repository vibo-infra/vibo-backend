export interface JoinWaitlistInput {
  email:        string;
  role?:        'attendee' | 'host';
  city?:        string;
  source?:      string;
  utm_source?:  string;
  utm_medium?:  string;
  utm_campaign?: string;
  ref?:         string;
}

export interface InsertSignupParams {
  email:        string;
  city:         string | null;
  role:         string;
  source:       string | null;
  utmSource:    string | null;
  utmMedium:    string | null;
  utmCampaign:  string | null;
  refCodeUsed:  string | null;
  referredBy:   string | null;
}

export interface NearbyEventsParams {
  /** `null` = do not filter by city (all published upcoming events, up to limit). */
  city: string | null;
  limit: number;
  category: string | null;
}

export interface NotifyCityInput {
  city:        string;
  message?:    string;
  dry_run?:    boolean;
}

export interface ConvertSignupInput {
  email:   string;
  user_id: string;
}

/** Waitlist chip set (marketing). App onboarding cities live in `app_config.onboarding_cities`. */
export const WAITLIST_CITY_OPTIONS = [
  'Mumbai',
  'Bangalore',
  'Pune',
  'Hyderabad',
  'Delhi',
  'Others',
] as const;

export type WaitlistCityOption = (typeof WAITLIST_CITY_OPTIONS)[number];

export interface UpdateWaitlistCityInput {
  email: string;
  city:  string;
}

/** Internal: POST /v0/api/web/email/send-batch */
export interface SendEmailBatchInput {
  template_key:
    | 'waitlist_confirmation'
    | 'city_launch'
    | 'referral_milestone'
    | 'raw_transactional';
  dry_run?: boolean;
  /** Interpolates {{placeholders}}; only for file templates */
  subject_override?: string;
  /** Extra {{vars}} merged into every recipient (file templates) */
  global_variables?: Record<string, string>;
  /** City-launch HTML fragment (inside the card) */
  message?: string;
  /**
   * Explicit list — or use filter.all_waitlist + confirm for waitlist_confirmation
   * (loads position + referral code from DB). referral_milestone still requires recipients.
   */
  recipients?: Array<{ email: string; variables?: Record<string, string> }>;
  filter?: {
    city?: string;
    /** Signups who joined using this referral code */
    used_referral_code?: string;
    /** Entire waitlist — must set confirm_all_waitlist: true */
    all_waitlist?: boolean;
  };
  confirm_all_waitlist?: boolean;
  /** Required when template_key is raw_transactional */
  raw?: {
    subject: string;
    html: string;
    text: string;
  };
}