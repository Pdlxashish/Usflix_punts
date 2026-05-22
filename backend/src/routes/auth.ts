/**
 * Auth routes — login, logout, session check.
 */
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../db/connection.js";
import { generateToken, requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  isRateLimitDisabled,
  validateNewPassword,
} from "../config/auth.js";
import { logActivity } from "../services/activity.js";

const router = Router();

// Precomputed bcrypt hash used when username is unknown (mitigates timing attacks)
const DUMMY_PASSWORD_HASH = "$2b$12$dHH1/Sj0qKcLdldoOHSWyOoHebPr3n6rAbdICBeXZrXAsVQWrD72O";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isRateLimited(ip: string): boolean {
  if (isRateLimitDisabled()) return false;

  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  if (isRateLimitDisabled()) return;

  const record = loginAttempts.get(ip);
  if (!record || Date.now() - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: Date.now() });
  } else {
    record.count++;
  }
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/** Small random delay on failed login to slow brute-force attempts */
async function failedLoginDelay(): Promise<void> {
  const ms = 250 + Math.floor(Math.random() * 250);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Sets HttpOnly cookie with JWT on success.
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);

    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: "Too many failed attempts. Please try again later." });
      return;
    }

    const { username, password } = req.body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      res.status(400).json({ ok: false, error: "Invalid credentials" });
      return;
    }

    const normalizedUsername = username.trim();
    if (!normalizedUsername || normalizedUsername.length > 64 || password.length > 256) {
      await failedLoginDelay();
      recordFailedAttempt(ip);
      res.status(401).json({ ok: false, error: "Invalid credentials" });
      return;
    }

    const { rows } = await pool.query(
      "SELECT id, username, password_hash FROM admin_users WHERE username = $1",
      [normalizedUsername]
    );

    const passwordHash = rows.length > 0 ? rows[0].password_hash : DUMMY_PASSWORD_HASH;
    const validPassword = await bcrypt.compare(password, passwordHash);

    if (rows.length === 0 || !validPassword) {
      await failedLoginDelay();
      recordFailedAttempt(ip);
      res.status(401).json({ ok: false, error: "Invalid credentials" });
      return;
    }

    clearFailedAttempts(ip);

    const user = rows[0];
    const token = generateToken({ userId: user.id, username: user.username });

    await logActivity(req, {
      action: "admin_login",
      adminUsername: user.username,
      details: { username: user.username },
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.json({ ok: true, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
router.post("/logout", optionalAuth, async (req: Request, res: Response) => {
  if (req.auth?.username) {
    await logActivity(req, {
      action: "admin_logout",
      adminUsername: req.auth.username,
      details: { username: req.auth.username },
    }).catch(() => {});
  }
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  res.json({ ok: true });
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * Requires authentication. Clears session cookie on success (user must sign in again).
 */
router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== "string" || !currentPassword) {
      res.status(400).json({ ok: false, error: "Current password is required." });
      return;
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      res.status(400).json({ ok: false, error: passwordError });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ ok: false, error: "New password must be different from your current password." });
      return;
    }

    const { rows } = await pool.query(
      "SELECT id, username, password_hash FROM admin_users WHERE id = $1",
      [req.auth!.userId]
    );

    if (rows.length === 0) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const user = rows[0];
    const validCurrent = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validCurrent) {
      await failedLoginDelay();
      res.status(401).json({ ok: false, error: "Current password is incorrect." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE admin_users SET password_hash = $1 WHERE id = $2",
      [passwordHash, user.id]
    );

    await logActivity(req, {
      action: "admin_password_changed",
      adminUsername: user.username,
      details: { username: user.username },
    });

    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
    res.json({ ok: true, logout: true });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * GET /api/auth/me
 * Returns current user info if authenticated.
 */
router.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({
    ok: true,
    username: req.auth!.username,
    userId: req.auth!.userId,
  });
});

export default router;
