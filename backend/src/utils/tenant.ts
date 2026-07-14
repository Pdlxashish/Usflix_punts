/**
 * Multi-tenant space resolution using couple_id from partner_links.
 * A "space" (tenant) is now determined by couple_id.
 * Partners in the same couple_id share all content.
 */
import { Request, Response, NextFunction } from "express";
import pool from "../db/connection.js";

export function getRequestUserId(req: Request): number | null {
  return req.auth?.userId ?? req.userAuth?.userId ?? null;
}

/**
 * Resolve the couple_id for the user.
 * If user is in a partner_links relationship, return their couple_id.
 * Otherwise return null (solo user, no sharing).
 */
export async function resolveCoupleId(userId: number): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT couple_id 
     FROM partner_links 
     WHERE user_a_id = $1 OR user_b_id = $1
     LIMIT 1`,
    [userId]
  );
  return rows[0]?.couple_id || null;
}

/**
 * Resolve user IDs that belong to the same couple (space).
 * Returns array of user IDs that should see shared content.
 */
export async function resolveSpaceUserIds(userId: number): Promise<number[]> {
  const coupleId = await resolveCoupleId(userId);
  
  if (!coupleId) {
    // No partner link, solo user - only see own content
    return [userId];
  }
  
  // Get all users in this couple
  const { rows } = await pool.query(
    `SELECT user_a_id, user_b_id 
     FROM partner_links 
     WHERE couple_id = $1`,
    [coupleId]
  );
  
  if (rows.length === 0) {
    return [userId];
  }
  
  // Return both partners' user IDs
  return [rows[0].user_a_id, rows[0].user_b_id];
}

/**
 * DEPRECATED: Use resolveSpaceUserIds instead
 * Kept for backward compatibility - returns first user ID from space
 */
export async function resolveSpaceUserId(userId: number): Promise<number> {
  const userIds = await resolveSpaceUserIds(userId);
  return userIds[0]; // Return first user (usually the content owner)
}

export async function getSpaceUserIdFromRequest(req: Request): Promise<number | null> {
  const userId = getRequestUserId(req);
  if (!userId) return null;
  return userId; // Return authenticated user's ID
}

/**
 * Get couple_id for the authenticated user
 */
export async function getCoupleIdFromRequest(req: Request): Promise<string | null> {
  const userId = getRequestUserId(req);
  if (!userId) return null;
  return resolveCoupleId(userId);
}

/**
 * Get all user IDs in the same space (couple)
 */
export async function getSpaceUserIdsFromRequest(req: Request): Promise<number[]> {
  const userId = getRequestUserId(req);
  if (!userId) return [];
  return resolveSpaceUserIds(userId);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      spaceUserId?: number;
      spaceUserIds?: number[];
      coupleId?: string | null;
    }
  }
}

/** Middleware: attach resolved space info before handlers. */
export async function attachSpaceUserId(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const userId = getRequestUserId(req);
  if (userId) {
    req.spaceUserId = userId;
    req.spaceUserIds = await resolveSpaceUserIds(userId);
    req.coupleId = await resolveCoupleId(userId);
  }
  next();
}
