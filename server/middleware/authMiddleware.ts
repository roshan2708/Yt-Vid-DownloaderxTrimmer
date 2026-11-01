import { NextFunction, Request, Response } from 'express';
import { AuthenticatedUser, verifyFirebaseIdToken } from '../utils/firebaseAdmin';

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware to require and verify Firebase ID Token for protected endpoints
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to query parameter (useful for browser downloads e.g. GET /api/download/:jobId?token=...)
  if (!token && req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Missing authentication token. Please sign in with Google.',
    });
    return;
  }

  try {
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized: Invalid or expired authentication token. Please sign in again.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication verification failed';
    res.status(401).json({
      error: `Unauthorized: ${msg}`,
    });
  }
}
