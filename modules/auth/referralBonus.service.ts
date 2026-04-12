import { pool } from '../../core/database/client';
import { applyDeltaWithClient } from '../spark/spark.repository';

const REFERRAL_INVITE_SPARKS = 10;

/** Credits referrer once per invitee; safe to call multiple times. */
export const tryGrantReferralBonus = async (
  referrerUserId: string,
  inviteeUserId: string
): Promise<void> => {
  if (!referrerUserId || !inviteeUserId || referrerUserId === inviteeUserId) {
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO referral_bonus_granted (invitee_user_id, referrer_user_id)
       VALUES ($1, $2)
       ON CONFLICT (invitee_user_id) DO NOTHING
       RETURNING invitee_user_id`,
      [inviteeUserId, referrerUserId]
    );
    if (rows.length === 0) {
      await client.query('COMMIT');
      return;
    }
    await applyDeltaWithClient(client, {
      userId: referrerUserId,
      amount: REFERRAL_INVITE_SPARKS,
      reason: 'referral_invite_bonus',
      metadata: { invitee_user_id: inviteeUserId },
    });
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[referral] bonus failed', e);
  } finally {
    client.release();
  }
};
