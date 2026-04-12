export function parseIsoDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Alias for JSON / app_config string dates */
export const parseIsoToDate = (value: unknown): Date | null => {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  return parseIsoDate(value);
};

/** When set and now is before this instant, all users host without spark cost (emergency / launch switch). */
export function isGlobalUnlimitedHostingActive(): boolean {
  const end = parseIsoDate(process.env.GLOBAL_UNLIMITED_HOSTING_UNTIL);
  return end !== null && Date.now() < end.getTime();
}

/**
 * Signup promo: users with `created_at` before this deadline get `unlimited_hosting_until` set to
 * `HOSTING_PROMO_UNLIMITED_END`. Configure via env for a fixed launch window; leave unset to disable.
 */
export function hostingPromoRegistrationDeadline(): Date | null {
  return parseIsoDate(process.env.HOSTING_PROMO_REGISTRATION_END);
}

export function hostingPromoUnlimitedUntil(): Date | null {
  return parseIsoDate(process.env.HOSTING_PROMO_UNLIMITED_END);
}

export function userHasUnlimitedHosting(unlimitedUntil: Date | string | null | undefined): boolean {
  if (isGlobalUnlimitedHostingActive()) return true;
  if (!unlimitedUntil) return false;
  const d = unlimitedUntil instanceof Date ? unlimitedUntil : new Date(unlimitedUntil);
  return !Number.isNaN(d.getTime()) && Date.now() < d.getTime();
}

/** Prefer app_config `global_unlimited_hosting_until`; falls back to env for legacy deploys. */
export function resolveGlobalUnlimitedHosting(
  configUntil: Date | null
): boolean {
  const fromConfig = configUntil && Date.now() < configUntil.getTime();
  if (fromConfig) return true;
  return isGlobalUnlimitedHostingActive();
}

export function resolveUnlimitedHostingForUser(
  userUnlimitedUntil: Date | string | null | undefined,
  configGlobalUntil: Date | null
): boolean {
  if (resolveGlobalUnlimitedHosting(configGlobalUntil)) return true;
  if (!userUnlimitedUntil) return false;
  const d =
    userUnlimitedUntil instanceof Date ? userUnlimitedUntil : new Date(userUnlimitedUntil);
  return !Number.isNaN(d.getTime()) && Date.now() < d.getTime();
}
