/**
 * Activity logging — profile sessions and audit trail.
 */
import { Request } from "express";
import pool from "../db/connection.js";

export type ActivityAction =
  | "profile_selected"
  | "profile_heartbeat"
  | "my_list_added"
  | "my_list_removed"
  | "comment_added"
  | "comment_deleted"
  | "media_viewed"
  | "admin_login"
  | "admin_logout"
  | "admin_password_changed";

export interface LogActivityInput {
  action: ActivityAction | string;
  profileId?: string | null;
  adminUsername?: string | null;
  clientId?: string | null;
  details?: Record<string, unknown>;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || req.ip || null;
  }
  return req.ip || null;
}

export async function logActivity(req: Request, input: LogActivityInput): Promise<void> {
  const ip = getClientIp(req);
  const userAgent = req.get("user-agent") || null;

  await pool.query(
    `INSERT INTO activity_logs (profile_id, admin_username, client_id, action, details, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.profileId ?? null,
      input.adminUsername ?? null,
      input.clientId ?? null,
      input.action,
      JSON.stringify(input.details ?? {}),
      ip,
      userAgent,
    ]
  );
}

export async function upsertProfileSession(
  req: Request,
  profileId: string,
  clientId: string
): Promise<void> {
  const ip = getClientIp(req);
  const userAgent = req.get("user-agent") || null;

  await pool.query(
    `INSERT INTO profile_sessions (profile_id, client_id, ip, user_agent, started_at, last_seen_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (profile_id, client_id)
     DO UPDATE SET last_seen_at = NOW(), ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent`,
    [profileId, clientId, ip, userAgent]
  );
}

const ACTIVE_SESSION_MINUTES = 30;

export async function getActivitySummary(): Promise<{
  activeSessions: Array<{
    profileId: string;
    profileName: string;
    profileColor: string;
    clientId: string;
    startedAt: string;
    lastSeenAt: string;
    ip: string | null;
    userAgent: string | null;
  }>;
  recentActivity: Array<{
    id: number;
    profileId: string | null;
    profileName: string | null;
    adminUsername: string | null;
    clientId: string | null;
    action: string;
    details: Record<string, unknown>;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
}> {
  const [sessionsResult, activityResult] = await Promise.all([
    pool.query(
      `SELECT ps.profile_id, ps.client_id, ps.ip, ps.user_agent, ps.started_at, ps.last_seen_at,
              p.name AS profile_name, p.color AS profile_color
       FROM profile_sessions ps
       JOIN profiles p ON p.id = ps.profile_id
       WHERE ps.last_seen_at > NOW() - INTERVAL '${ACTIVE_SESSION_MINUTES} minutes'
       ORDER BY ps.last_seen_at DESC`
    ),
    pool.query(
      `SELECT al.id, al.profile_id, al.admin_username, al.client_id, al.action, al.details,
              al.ip, al.user_agent, al.created_at, p.name AS profile_name
       FROM activity_logs al
       LEFT JOIN profiles p ON p.id = al.profile_id
       ORDER BY al.created_at DESC
       LIMIT 150`
    ),
  ]);

  return {
    activeSessions: sessionsResult.rows.map((r) => ({
      profileId: r.profile_id,
      profileName: r.profile_name,
      profileColor: r.profile_color,
      clientId: r.client_id,
      startedAt: r.started_at,
      lastSeenAt: r.last_seen_at,
      ip: r.ip,
      userAgent: r.user_agent,
    })),
    recentActivity: activityResult.rows.map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      profileName: r.profile_name,
      adminUsername: r.admin_username,
      clientId: r.client_id,
      action: r.action,
      details: typeof r.details === "object" && r.details !== null ? r.details : {},
      ip: r.ip,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    })),
  };
}
