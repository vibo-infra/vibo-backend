import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../../core/database/client';
import { SET_USER_REFERRAL_CODE } from './auth.queries';

/** Assign a unique referral_code; retries on collision. */
export const assignReferralCodeForNewUser = async (
  client: PoolClient,
  userId: string
): Promise<void> => {
  const { rows: existing } = await client.query(
    `SELECT referral_code FROM users WHERE user_id = $1`,
    [userId]
  );
  if ((existing[0] as { referral_code?: string } | undefined)?.referral_code) {
    return;
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    try {
      const { rows } = await client.query(SET_USER_REFERRAL_CODE, [userId, code]);
      if (rows.length > 0) return;
    } catch {
      /* unique violation on referral_code — retry */
    }
  }
  throw new Error('REFERRAL_CODE_ASSIGN_FAILED');
};

/** Backfill referral_code for accounts created before referrals shipped. */
export const ensureReferralCodeForExistingUser = async (userId: string): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT referral_code FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    if ((rows[0] as { referral_code?: string } | undefined)?.referral_code) {
      await client.query('COMMIT');
      return;
    }
    await assignReferralCodeForNewUser(client, userId);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
