import { getConfigValueByKey } from './appConfig.repository';

export type LaunchMarketsPublic = {
  liveCityNames: string[];
  waitlistGoalPerCity: number;
  referralInviteSparks: number;
};

const DEFAULT_LIVE = ['Mumbai'] as const;
const DEFAULT_GOAL = 100;
const DEFAULT_SPARKS = 20;

function parseStringArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
  return out.length ? out : null;
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return fallback;
}

export async function getLaunchMarketsPublic(): Promise<LaunchMarketsPublic> {
  const [liveRaw, goalRaw, sparksRaw] = await Promise.all([
    getConfigValueByKey('launch_live_cities'),
    getConfigValueByKey('city_waitlist_launch_goal'),
    getConfigValueByKey('referral_invite_sparks'),
  ]);
  return {
    liveCityNames: parseStringArray(liveRaw) ?? [...DEFAULT_LIVE],
    waitlistGoalPerCity: parsePositiveInt(goalRaw, DEFAULT_GOAL),
    referralInviteSparks: parsePositiveInt(sparksRaw, DEFAULT_SPARKS),
  };
}

let sparksCache: { value: number; loadedAt: number } | null = null;
const SPARKS_TTL_MS = 60_000;

/** Spark credit for app referral signup (matches `referral_invite_sparks` in app_config). */
export async function getReferralInviteSparksCached(): Promise<number> {
  const now = Date.now();
  if (sparksCache && now - sparksCache.loadedAt < SPARKS_TTL_MS) {
    return sparksCache.value;
  }
  const raw = await getConfigValueByKey('referral_invite_sparks');
  const value = parsePositiveInt(raw, DEFAULT_SPARKS);
  sparksCache = { value, loadedAt: now };
  return value;
}
