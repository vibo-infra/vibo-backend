import type { PoolClient } from 'pg';
import type { AppConfigSnapshot } from '../app-config/appConfig.service';
import { CHECK_WAITLIST_HOSTING_ELIGIBILITY } from './events.queries';

export type HostUserRow = {
  email: string;
  is_verified: boolean;
  is_active: boolean;
  banned_at: Date | string | null;
  /** Future: verified government ID; null/undefined = not verified. */
  identity_verified_at?: Date | string | null;
};

/**
 * Enforces account state, optional MVP verification gate, and pre-launch waitlist rules.
 * Call inside a transaction after locking the user row.
 */
export const assertUserMayHost = async (
  client: PoolClient,
  params: {
    now: Date;
    host: HostUserRow;
    config: AppConfigSnapshot;
  }
): Promise<void> => {
  const { host, config, now } = params;
  if (!host.is_active) {
    throw new Error('ACCOUNT_INACTIVE');
  }
  if (host.banned_at) {
    throw new Error('ACCOUNT_BANNED');
  }
  if (config.hostingRequiresVerificationMvp && !host.is_verified) {
    throw new Error('HOST_VERIFICATION_REQUIRED');
  }
  if (config.hostingRequiresIdentityVerification) {
    const raw = host.identity_verified_at;
    if (raw == null) {
      throw new Error('HOSTING_IDENTITY_REQUIRED');
    }
    const t = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(t.getTime())) {
      throw new Error('HOSTING_IDENTITY_REQUIRED');
    }
  }
  const launch = config.productLaunchAt;
  if (launch && now < launch) {
    const { rows } = await client.query(CHECK_WAITLIST_HOSTING_ELIGIBILITY, [
      host.email,
      config.earlyAccessCutoffAt,
    ]);
    const eligible = Boolean((rows[0] as { eligible?: boolean } | undefined)?.eligible);
    if (!eligible) {
      throw new Error('HOSTING_WAITLIST_REQUIRED');
    }
  }
};
