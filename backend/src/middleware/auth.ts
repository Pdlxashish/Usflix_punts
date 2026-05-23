/**
 * JWT authentication middleware.
 * Reads token from HttpOnly cookie "usflix_token".
 */
import { Request, Response, NextFunction } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { AUTH_COOKIE_NAME, getJwtSecret, validateJwtSecret } from "../config/auth.js";

validateJwtSecret();

const JWT_SECRET = getJwtSecret();

export interface AuthPayload {
  userId: number;
  username: string;
}

// Extend Express Request to include auth info (namespace required by @types/express)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Middleware that requires a valid JWT.
 * Returns 401 if not authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ ok: false, error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}

/**
 * Optional auth — attaches auth info if token present, but doesn't block.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.auth = payload;
    } catch {
      // Token invalid — continue without auth
    }
  }

  next();
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(payload: AuthPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"];
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
