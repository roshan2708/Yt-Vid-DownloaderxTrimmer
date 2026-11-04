import { NextFunction, Request, Response } from 'express';
import { AdminUser, verifyAdminToken } from '../utils/firebaseAdmin';

export interface AdminAuthRequest extends Request {
  adminUser?: AdminUser;
}

/**
 * Middleware to require verified Admin / Superadmin role for sensitive endpoints
 */
export async function requireAdmin(
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token && req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Missing administrative authorization token.',
    });
    return;
  }

  try {
    const adminUser = await verifyAdminToken(token);
    if (!adminUser) {
      res.status(403).json({
        error: 'Forbidden: Access denied. Administrative privileges are required for this resource.',
      });
      return;
    }

    req.adminUser = adminUser;
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Admin authorization failed';
    res.status(403).json({
      error: `Forbidden: ${msg}`,
    });
  }
}
