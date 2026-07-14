/**
 * Clerk-based auth middleware for Express.
 * Verifies the Clerk session token and resolves the internal users.id.
 */
import { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import pool from "../db/connection.js";
import { getAllowedFrontendOrigins } from "../config/env.js";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface AuthPayload {
  userId: number;
  clerkId: string;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      userAuth?: AuthPayload;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.["__session"];
}

async function verifyClerkToken(token: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const isProd = process.env.NODE_ENV === "production";
  const authorizedParties = getAllowedFrontendOrigins();

  if (!isProd) {
    // Dev: ports change (8080/8081/etc.) — verify signature only
    return await verifyToken(token, { secretKey });
  }

  return await verifyToken(token, {
    secretKey,
    ...(authorizedParties.length > 0 ? { authorizedParties } : {}),
  });
}

/**
 * Ensure the user has at least one self profile linked in user_profiles.
 */
async function ensureUserProfiles(userId: number, displayName: string): Promise<void> {
  const { rows: linked } = await pool.query(
    "SELECT profile_id FROM user_profiles WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (linked.length > 0) return;

  const { rows: owned } = await pool.query(
    "SELECT id, name FROM profiles WHERE user_id = $1 ORDER BY id ASC",
    [userId]
  );

  if (owned.length > 0) {
    // Link only the canonical self profile — do not attach legacy seed profiles (p1/p2/p3)
    const canonical =
      owned.find((p) => p.id === `p-${userId}-self`) ??
      owned.find((p) => !["p1", "p2", "p3"].includes(p.id)) ??
      owned[0];
    await pool.query(
      `INSERT INTO user_profiles (user_id, profile_id, is_primary)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, profile_id) DO UPDATE SET is_primary = true`,
      [userId, canonical.id]
    );
    await pool.query(
      `UPDATE profiles SET role = 'self' WHERE id = $1`,
      [canonical.id]
    );
    return;
  }

  const profileId = `p-${userId}-self`;
  const profileName = displayName.split(" ")[0] || displayName || "You";
  await pool.query(
    `INSERT INTO profiles (id, user_id, name, color, avatar_shape, role)
     VALUES ($1, $2, $3, 'bg-blue-500', 'circle', 'self')
     ON CONFLICT (id) DO NOTHING`,
    [profileId, userId, profileName]
  );
  await pool.query(
    `INSERT INTO user_profiles (user_id, profile_id, is_primary)
     VALUES ($1, $2, true)
     ON CONFLICT (user_id, profile_id) DO NOTHING`,
    [userId, profileId]
  );
}

/**
 * Resolve (or create) an internal user record for a Clerk user.
 */
export async function resolveInternalUser(clerkId: string): Promise<number> {
  const { rows } = await pool.query(
    "SELECT user_id, display_name, email FROM clerk_users WHERE clerk_id = $1",
    [clerkId]
  );

  let userId: number;
  let displayName: string;

  if (rows.length > 0) {
    userId = rows[0].user_id;
    displayName = rows[0].display_name || rows[0].email || "You";
    await ensureUserProfiles(userId, displayName);
    return userId;
  }

  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? `${clerkId}@clerk.local`;
  displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;

  const upsert = await pool.query(
    `INSERT INTO users (email, display_name, auth_provider, email_verified, created_at, updated_at)
     VALUES ($1, $2, 'clerk', true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           auth_provider = 'clerk',
           email_verified = true,
           updated_at = NOW()
     RETURNING id`,
    [email, displayName]
  );
  userId = upsert.rows[0].id;

  await pool.query(
    `INSERT INTO clerk_users (clerk_id, user_id, email, display_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (clerk_id) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           user_id = EXCLUDED.user_id`,
    [clerkId, userId, email, displayName]
  );

  await ensureUserProfiles(userId, displayName);
  return userId;
}

async function attachAuth(req: Request, token: string): Promise<void> {
  const payload = await verifyClerkToken(token);
  const clerkId = payload.sub;
  if (!clerkId) {
    throw new Error("Token missing subject");
  }
  const sessionId = typeof payload.sid === "string" ? payload.sid : "";
  const userId = await resolveInternalUser(clerkId);
  req.auth = { userId, clerkId, sessionId };
  req.userAuth = { userId, clerkId, sessionId };
}

/**
 * Requires a valid Clerk session. Resolves to internal user ID.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ ok: false, error: "Authentication required" });
    return;
  }
  try {
    await attachAuth(req, token);
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Auth verification failed:", err);
    }
    res.status(401).json({ ok: false, error: "Invalid or expired session" });
  }
}

export const requireUserAuth = requireAuth;

/**
 * Optional auth — attaches auth info if valid token present, but doesn't block.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (token) {
    try {
      await attachAuth(req, token);
    } catch {
      // Invalid token — continue unauthenticated
    }
  }
  next();
}

export const optionalUserAuth = optionalAuth;
