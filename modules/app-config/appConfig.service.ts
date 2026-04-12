import { listAllConfigRows } from './appConfig.repository';
import { parseIsoToDate } from '../../core/config/hosting';

/** Fallbacks if DB row missing or unparsable */
const FALLBACK = {
  paidEventHostSparkCost: 30,
  hostingRequiresVerificationMvp: false,
  regularFirstLoginSparkGrant: 30,
  welcomeFreePaidHostingsCount: 3,
  waitlistTier1MaxPosition: 100,
  waitlistTier1SparkGrantTotal: 1030,
  waitlistTier2SparkGrantTotal: 530,
  waitlistTier1HostingSparkCost: 20,
  waitlistTier1DiscountMonths: 6,
  waitlistBenefitsRequireSignupBeforeAccount: true,
  hostingRequiresIdentityVerification: false,
} as const;

export type AppConfigSnapshot = {
  productLaunchAt: Date | null;
  earlyAccessCutoffAt: Date | null;
  paidEventHostSparkCost: number;
  hostingRequiresVerificationMvp: boolean;
  globalUnlimitedHostingUntil: Date | null;
  hostingPromoRegistrationEnd: Date | null;
  hostingPromoUnlimitedEnd: Date | null;
  /** One-time sparks for accounts not receiving a waitlist bundle. */
  regularFirstLoginSparkGrant: number;
  /** Paid listings hosted without spark debit before standard cost applies. */
  welcomeFreePaidHostingsCount: number;
  waitlistTier1MaxPosition: number;
  waitlistTier1SparkGrantTotal: number;
  waitlistTier2SparkGrantTotal: number;
  /** Paid listing spark cost while tier1 discount window is active. */
  waitlistTier1HostingSparkCost: number;
  waitlistTier1DiscountMonths: number;
  /** If true, waitlist email must have joined waitlist before (or within grace of) account creation. */
  waitlistBenefitsRequireSignupBeforeAccount: boolean;
  /** Future: require identity_verified_at on user to host. */
  hostingRequiresIdentityVerification: boolean;
};

function jsonbToDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return parseIsoToDate(v);
  return null;
}

function jsonbToNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function jsonbToBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function buildSnapshot(map: Map<string, unknown>): AppConfigSnapshot {
  return {
    productLaunchAt: jsonbToDate(map.get('product_launch_at')),
    earlyAccessCutoffAt: jsonbToDate(map.get('early_access_cutoff_at')),
    paidEventHostSparkCost: jsonbToNumber(
      map.get('paid_event_host_spark_cost'),
      FALLBACK.paidEventHostSparkCost
    ),
    hostingRequiresVerificationMvp: jsonbToBool(
      map.get('hosting_requires_verification_mvp'),
      FALLBACK.hostingRequiresVerificationMvp
    ),
    globalUnlimitedHostingUntil: jsonbToDate(map.get('global_unlimited_hosting_until')),
    hostingPromoRegistrationEnd: jsonbToDate(map.get('hosting_promo_registration_end')),
    hostingPromoUnlimitedEnd: jsonbToDate(map.get('hosting_promo_unlimited_end')),
    regularFirstLoginSparkGrant: jsonbToNumber(
      map.get('regular_first_login_spark_grant'),
      FALLBACK.regularFirstLoginSparkGrant
    ),
    welcomeFreePaidHostingsCount: jsonbToNumber(
      map.get('welcome_free_paid_hostings_count'),
      FALLBACK.welcomeFreePaidHostingsCount
    ),
    waitlistTier1MaxPosition: jsonbToNumber(
      map.get('waitlist_tier1_max_position'),
      FALLBACK.waitlistTier1MaxPosition
    ),
    waitlistTier1SparkGrantTotal: jsonbToNumber(
      map.get('waitlist_tier1_spark_grant_total'),
      FALLBACK.waitlistTier1SparkGrantTotal
    ),
    waitlistTier2SparkGrantTotal: jsonbToNumber(
      map.get('waitlist_tier2_spark_grant_total'),
      FALLBACK.waitlistTier2SparkGrantTotal
    ),
    waitlistTier1HostingSparkCost: jsonbToNumber(
      map.get('waitlist_tier1_hosting_spark_cost'),
      FALLBACK.waitlistTier1HostingSparkCost
    ),
    waitlistTier1DiscountMonths: jsonbToNumber(
      map.get('waitlist_tier1_discount_months'),
      FALLBACK.waitlistTier1DiscountMonths
    ),
    waitlistBenefitsRequireSignupBeforeAccount: jsonbToBool(
      map.get('waitlist_benefits_require_signup_before_account'),
      FALLBACK.waitlistBenefitsRequireSignupBeforeAccount
    ),
    hostingRequiresIdentityVerification: jsonbToBool(
      map.get('hosting_requires_identity_verification'),
      FALLBACK.hostingRequiresIdentityVerification
    ),
  };
}

let cache: { snapshot: AppConfigSnapshot; loadedAt: number } | null = null;
const TTL_MS = 60_000;

export const invalidateAppConfigCache = () => {
  cache = null;
};

export const getAppConfigSnapshot = async (): Promise<AppConfigSnapshot> => {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) {
    return cache.snapshot;
  }
  const rows = await listAllConfigRows();
  const map = new Map<string, unknown>();
  for (const r of rows) {
    map.set(r.config_key, r.value);
  }
  const snapshot = buildSnapshot(map);
  cache = { snapshot, loadedAt: now };
  return snapshot;
};
