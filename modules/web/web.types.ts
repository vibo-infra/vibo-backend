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
  city:      string;
  limit:     number;
  category:  string | null;
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