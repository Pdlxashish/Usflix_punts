/**
 * Mood of the Day routes — daily mood/emoji widget.
 * 
 * 🔒 SECURITY UPDATE: All routes now require user authentication
 * and filter data by user_id to prevent data leakage.
 * 
 * GET /api/mood-of-day/today    — requires user auth, returns user's today mood
 * GET /api/mood-of-day          — requires user auth, returns user's mood history
 * POST /api/mood-of-day         — admin only, set/update user's today mood
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds } from "../utils/tenant.js";
import { randomUUID } from "crypto";

const router = Router();

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

function mapRow(r: any) {
  return {
    id: r.id,
    moodDate: r.mood_date,
    emoji: r.emoji,
    message: r.message,
    createdAt: r.created_at,
  };
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * GET /api/mood-of-day/today
 * 🔒 NOW REQUIRES AUTH - Returns today's mood from both partners
 */
router.get("/today", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const today = todayStr();
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 2}`).join(',');
    const { rows } = await pool.query(
      `SELECT * FROM mood_of_day WHERE mood_date=$1 AND user_id IN (${placeholders})`,
      [today, ...spaceUserIds]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "No mood set for today" });
      return;
    }
    // Return both partners' moods as an array
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("mood-of-day today GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch mood" });
  }
});

/**
 * GET /api/mood-of-day — mood history
 * 🔒 NOW REQUIRES AUTH - Returns mood history from both partners
 */
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT * FROM mood_of_day WHERE user_id IN (${placeholders}) ORDER BY mood_date DESC LIMIT 30`,
      spaceUserIds
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("mood-of-day GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch moods" });
  }
});

/**
 * POST /api/mood-of-day — upsert today's mood
 * Admin creates/updates mood for their user account
 * 🔒 NOW INCLUDES user_id in INSERT
 * 
 * Note: Uses ON CONFLICT (mood_date, user_id) to update existing mood
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { emoji, message, moodDate } = req.body;
    if (!emoji?.trim()) {
      res.status(400).json({ ok: false, error: "emoji is required" });
      return;
    }
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const date = moodDate || todayStr();
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO mood_of_day (id, user_id, mood_date, emoji, message)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (mood_date, user_id) DO UPDATE SET emoji=$4, message=$5
       RETURNING *`,
      [id, userId, date, emoji.trim(), message?.trim() || ""]
    );
    res.status(201).json({ ok: true, mood: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("mood-of-day POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set mood" });
  }
});

export default router;
