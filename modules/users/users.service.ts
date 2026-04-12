import {
  findAuthUserPayload,
  patchUser,
  type PatchUserInput,
} from './users.repository';
import { ensureReferralCodeForExistingUser } from '../auth/referralCode.util';
import { assertAllowedDefaultCity } from '../app-config/onboardingCities.service';

export { applyPostAuthGrants } from './authGrants.service';

export type WaitlistTierPublic = 'tier1' | 'tier2' | null;

export type AppHomePreferences = {
  showUpcomingOnHome: boolean;
  showHappeningSoonOnHome: boolean;
  themeMode?: 'light' | 'dark';
};

export type PublicAuthUser = {
  userId: string;
  email: string;
  isVerified: boolean;
  sparkBalance: number;
  defaultCity: string | null;
  firstName: string | null;
  unlimitedHostingUntil: string | null;
  pushNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  waitlistTier: WaitlistTierPublic;
  waitlistHostingDiscountUntil: string | null;
  sparkWelcomePaidHostingsUsed: number;
  referralCode: string | null;
  appPreferences: AppHomePreferences;
};

function parseWaitlistTier(v: unknown): WaitlistTierPublic {
  if (v === 'tier1' || v === 'tier2') return v;
  return null;
}

function parseAppPreferences(raw: unknown): AppHomePreferences {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const tm = o.themeMode;
  const themeMode = tm === 'light' || tm === 'dark' ? tm : undefined;
  return {
    showUpcomingOnHome: o.showUpcomingOnHome !== false,
    showHappeningSoonOnHome: o.showHappeningSoonOnHome !== false,
    ...(themeMode ? { themeMode } : {}),
  };
}

function toPublic(row: Record<string, unknown> | null): PublicAuthUser | null {
  if (!row) return null;
  return {
    userId: row.user_id as string,
    email: row.email as string,
    isVerified: row.is_verified as boolean,
    sparkBalance: Number(row.spark_balance ?? 0),
    defaultCity: (row.default_city as string | null) ?? null,
    firstName: (row.first_name as string | null) ?? null,
    unlimitedHostingUntil: row.unlimited_hosting_until
      ? new Date(row.unlimited_hosting_until as string).toISOString()
      : null,
    pushNotificationsEnabled: row.push_notifications_enabled as boolean,
    inAppNotificationsEnabled: row.in_app_notifications_enabled as boolean,
    waitlistTier: parseWaitlistTier(row.waitlist_tier),
    waitlistHostingDiscountUntil: row.waitlist_hosting_discount_until
      ? new Date(row.waitlist_hosting_discount_until as string).toISOString()
      : null,
    sparkWelcomePaidHostingsUsed: Number(row.spark_welcome_paid_hostings_used ?? 0),
    referralCode: (row.referral_code as string | null) ?? null,
    appPreferences: parseAppPreferences(row.app_preferences),
  };
}

export const getPublicAuthUser = async (userId: string) => {
  let row = await findAuthUserPayload(userId);
  if (row && !(row as { referral_code?: string }).referral_code) {
    await ensureReferralCodeForExistingUser(userId);
    row = await findAuthUserPayload(userId);
  }
  return toPublic(row);
};

export const updateMe = async (userId: string, input: PatchUserInput) => {
  if (input.defaultCity !== undefined && input.defaultCity) {
    await assertAllowedDefaultCity(input.defaultCity);
  }
  const updated = await patchUser(userId, input);
  return toPublic(updated);
};
