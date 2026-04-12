import { Request, Response } from 'express';
import * as sparkService from './spark.service';

export const getBalance = async (req: Request, res: Response) => {
  try {
    const balance = await sparkService.getBalance(req.user.userId);
    return res.status(200).json({ balance });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load balance' });
  }
};

export const listTransactions = async (req: Request, res: Response) => {
  try {
    const rawLimit = parseInt(String(req.query.limit ?? '20'), 10);
    const rawOffset = parseInt(String(req.query.offset ?? '0'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 20;
    const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
    const transactions = await sparkService.listTransactions(req.user.userId, limit, offset);
    return res.status(200).json({ transactions, limit, offset });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load transactions' });
  }
};
