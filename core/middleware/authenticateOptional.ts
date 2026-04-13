import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findSessionByToken } from '../../modules/auth/auth.repository';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set when a valid Bearer session is present; anonymous otherwise. */
    viewerUserId?: string;
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

/** Does not 401 — attaches `req.viewerUserId` when the Bearer token is valid. */
export const authenticateOptional = async (req: Request, _res: Response, next: NextFunction) => {
  req.viewerUserId = undefined;
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    const session = await findSessionByToken(token);
    if (session && session.is_active && !session.banned_at && decoded.userId) {
      req.viewerUserId = decoded.userId;
    }
  } catch {
    /* invalid or expired JWT — anonymous */
  }
  next();
};
