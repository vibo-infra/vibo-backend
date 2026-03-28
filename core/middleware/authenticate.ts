import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findSessionByToken } from '../../modules/auth/auth.repository';

// Extend Express's Request type so req.user is available everywhere
declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        email: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // 1. Verify the JWT signature and expiry
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. Check the session still exists in DB
    // (covers logout — token is valid JWT but session was deleted)
    const session = await findSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired, please login again' });
    }

    if (!session.is_active || session.banned_at) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    // 3. Attach user to request — available in all downstream handlers
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};