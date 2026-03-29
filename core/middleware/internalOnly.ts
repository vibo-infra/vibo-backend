import { Request, Response, NextFunction } from 'express';

export const internalOnly = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-internal-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};