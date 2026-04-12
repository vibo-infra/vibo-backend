import type { PoolClient } from 'pg';
import { pool } from '../../core/database/client';
import { InsufficientSparksError } from './insufficientSparksError';
import {
  INSERT_SPARK_WALLET,
  LOCK_SPARK_WALLET,
  UPDATE_SPARK_WALLET_BALANCE,
  INSERT_SPARK_TRANSACTION,
  UPDATE_SPARK_TRANSACTION_REFERENCE,
  SYNC_USERS_SPARK_BALANCE,
  LIST_SPARK_TRANSACTIONS,
  GET_SPARK_BALANCE,
  REALIGN_SPARK_WALLET_WITH_USERS_IF_NO_LEDGER,
  MIRROR_USERS_SPARK_FROM_WALLET,
} from './spark.queries';

export const ensureWallet = async (client: PoolClient, userId: string) => {
  await client.query(INSERT_SPARK_WALLET, [userId]);
};

/**
 * Fixes legacy drift: `spark_wallet` row exists with balance 0 while `users.spark_balance`
 * still holds grants from older code — `/me` used COALESCE(wallet, users) which picked 0.
 * Also mirrors wallet → users whenever they differ after ledger activity.
 */
export const reconcileSparkMirrorForUser = async (
  userId: string,
  client?: PoolClient
) => {
  const db = client ?? pool;
  await db.query(INSERT_SPARK_WALLET, [userId]);
  await db.query(REALIGN_SPARK_WALLET_WITH_USERS_IF_NO_LEDGER, [userId]);
  await db.query(MIRROR_USERS_SPARK_FROM_WALLET, [userId]);
};

export const getBalanceForUser = async (client: PoolClient, userId: string): Promise<number> => {
  await ensureWallet(client, userId);
  const { rows } = await client.query(LOCK_SPARK_WALLET, [userId]);
  const row = rows[0] as { balance: string } | undefined;
  return row ? Number(row.balance) : 0;
};

type ApplyDeltaParams = {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Shown to the client when a debit would exceed balance (402). */
  insufficientMessage?: string;
};

/**
 * Locks wallet row (must call ensureWallet first in same transaction).
 * `amount` > 0 credit, < 0 debit. Fails if balance would go negative.
 */
export const applyDeltaWithClient = async (
  client: PoolClient,
  params: ApplyDeltaParams
): Promise<{ balanceAfter: number; transactionId: string }> => {
  await ensureWallet(client, params.userId);
  const { rows: lockRows } = await client.query(LOCK_SPARK_WALLET, [params.userId]);
  const row = lockRows[0] as { balance: string } | undefined;
  if (!row) {
    throw new Error('SPARK_WALLET_MISSING');
  }
  const current = Number(row.balance);
  const next = current + params.amount;
  if (next < 0) {
    const required = params.amount < 0 ? -params.amount : 0;
    throw new InsufficientSparksError(
      params.insufficientMessage ?? 'Not enough Sparks for this action',
      required,
      current
    );
  }
  const { rows: upd } = await client.query(UPDATE_SPARK_WALLET_BALANCE, [
    params.userId,
    next,
  ]);
  if (!upd[0]) {
    throw new Error('SPARK_UPDATE_FAILED');
  }
  await client.query(SYNC_USERS_SPARK_BALANCE, [params.userId, next]);
  const { rows: txRows } = await client.query(INSERT_SPARK_TRANSACTION, [
    params.userId,
    params.amount,
    next,
    params.reason,
    params.referenceType ?? null,
    params.referenceId ?? null,
    params.metadata ? JSON.stringify(params.metadata) : null,
  ]);
  const tx = txRows[0] as { transaction_id: string };
  return { balanceAfter: next, transactionId: tx.transaction_id };
};

export const attachTransactionReference = async (
  client: PoolClient,
  userId: string,
  transactionId: string,
  referenceType: string,
  referenceId: string
) => {
  await client.query(UPDATE_SPARK_TRANSACTION_REFERENCE, [
    transactionId,
    referenceType,
    referenceId,
    userId,
  ]);
};

export const listTransactionsWithClient = async (
  client: PoolClient,
  userId: string,
  limit: number,
  offset: number
) => {
  const { rows } = await client.query(LIST_SPARK_TRANSACTIONS, [userId, limit, offset]);
  return rows;
};

export const getBalanceStandalone = async (userId: string) => {
  await reconcileSparkMirrorForUser(userId);
  const { rows } = await pool.query(GET_SPARK_BALANCE, [userId]);
  const r = rows[0] as { balance: string } | undefined;
  return r ? Number(r.balance) : 0;
};
