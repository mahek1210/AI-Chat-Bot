import express from 'express';
import { supabase } from '../utils/supabase';

// Extend Express Request globally to carry the verified Supabase user
declare global {
  namespace Express {
    interface Request {
      supabaseUser?: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      };
    }
  }
}

/**
 * requireAuth middleware
 * Extracts the Bearer token from the Authorization header,
 * verifies it with Supabase, and sets req.supabaseUser.
 * Returns 401/403 on failure.
 */
export const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
      return;
    }

    // Attach verified user to request for downstream use
    req.supabaseUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };

    // Also set req.user (existing interface) for backward-compat with old routes
    req.user = { id: user.id };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Forbidden: Token verification failed' });
  }
};
