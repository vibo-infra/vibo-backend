import { pool } from '../../core/database/client';
import { getBalanceStandalone, listTransactionsWithClient } from './spark.repository';

export const getBalance = (userId: string) => getBalanceStandalone(userId);

export const listTransactions = async (
  userId: string,
  limit: number,
  offset: number
) => {
  const client = await pool.connect();
  try {
    return await listTransactionsWithClient(client, userId, limit, offset);
  } finally {
    client.release();
  }
};
