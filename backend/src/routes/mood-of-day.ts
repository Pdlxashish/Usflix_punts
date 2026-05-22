/**
 * Mood of the Day routes — daily mood/emoji widget.
 * GET /api/mood-of-day/today    — public, returns today's mood
 * GET /api/mood-of-day          — public, returns all moods (history)
 * POST /api/mood-of-day         — admin only, set/update today's mood
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
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

/** GET /api/mood-of-day/today */
router.get("/today", async (_req: Request, res: Response) => {
  try {
    const today = todayStr();
    const { rows } = await pool.query(
      "SELECT * FROM mood_of_day WHERE mood_date=$1",
      [today]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "No mood set for today" });
      return;
    }
    res.json(mapRow(rows[0]));
  } catch (err: any) {
    console.error("mood-of-day today GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch mood" });
  }
});

/** GET /api/mood-of-day — all history */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM mood_of_day ORDER BY mood_date DESC LIMIT 30"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("mood-of-day GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch moods" });
  }
});

/** POST /api/mood-of-day — upsert today's mood */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { emoji, message, moodDate } = req.body;
    if (!emoji?.trim()) {
      res.status(400).json({ ok: false, error: "emoji is required" });
      return;
    }
    const date = moodDate || todayStr();
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO mood_of_day (id, mood_date, emoji, message)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (mood_date) DO UPDATE SET emoji=$3, message=$4
       RETURNING *`,
      [id, date, emoji.trim(), message?.trim() || ""]
    );
    res.status(201).json({ ok: true, mood: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("mood-of-day POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set mood" });
  }
});

export default router;
