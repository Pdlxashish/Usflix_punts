/**
 * Time Greetings routes — Good morning/afternoon/evening/night messages
 * GET /api/greetings/current  — public, get current greeting based on time
 * GET /api/greetings          — admin only, get all greetings
 * POST /api/greetings         — admin only
 * PUT /api/greetings/:id      — admin only
 * DELETE /api/greetings/:id   — admin only
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function migrationError(err: any): string | undefined {
  if (err.code === "42P01") return "Database table missing. Restart backend to create tables.";
  if (err.code === "42703") return "Database column missing. Restart backend to run migrations.";
  return undefined;
}

function mapRow(r: any) {
  return {
    id: r.id,
    timeOfDay: r.time_of_day,
    message: r.message,
    isActive: r.is_active,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

function getCurrentTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** GET /api/greetings/current */
router.get("/current", async (req: Request, res: Response) => {
  try {
    // Prefer client-supplied timeOfDay (browser local time) over server time
    const clientTimeOfDay = typeof req.query.timeOfDay === "string" ? req.query.timeOfDay : null;
    const validTimes = ["morning", "afternoon", "evening", "night"];
    const timeOfDay = (clientTimeOfDay && validTimes.includes(clientTimeOfDay))
      ? clientTimeOfDay
      : getCurrentTimeOfDay();
    const { rows } = await pool.query(
      "SELECT * FROM time_greetings WHERE time_of_day=$1 AND is_active=true ORDER BY sort_rank ASC, created_at ASC",
      [timeOfDay]
    );
    if (rows.length === 0) {
      // Default messages if none set
      const defaults: Record<string, string> = {
        morning: "Good morning, sunshine! ☀️",
        afternoon: "Hope you're having a wonderful afternoon! 💕",
        evening: "Good evening, beautiful! 🌅",
        night: "Sweet dreams, my love! 🌙",
      };
      res.json({ timeOfDay, message: defaults[timeOfDay] || "Hello! 💕", isDefault: true });
      return;
    }
    // Pick a random one if multiple
    const greeting = rows[Math.floor(Math.random() * rows.length)];
    res.json({ ...mapRow(greeting), timeOfDay, isDefault: false });
  } catch (err: any) {
    console.error("greetings current GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch greeting" });
  }
});

/** GET /api/greetings */
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM time_greetings ORDER BY time_of_day, sort_rank ASC, created_at ASC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("greetings GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch greetings" });
  }
});

/** POST /api/greetings */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { timeOfDay, message, isActive, sortRank } = req.body;
    if (!timeOfDay || !["morning", "afternoon", "evening", "night"].includes(timeOfDay)) {
      res.status(400).json({ ok: false, error: "Valid timeOfDay is required (morning/afternoon/evening/night)" });
      return;
    }
    if (!message?.trim()) {
      res.status(400).json({ ok: false, error: "Message is required" });
      return;
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO time_greetings (id, time_of_day, message, is_active, sort_rank)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, timeOfDay, message.trim(), isActive ?? true, sortRank ?? 0]
    );
    res.status(201).json({ ok: true, greeting: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("greetings POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add greeting" });
  }
});

/** PUT /api/greetings/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { timeOfDay, message, isActive, sortRank } = req.body;
    if (!timeOfDay || !["morning", "afternoon", "evening", "night"].includes(timeOfDay)) {
      res.status(400).json({ ok: false, error: "Valid timeOfDay is required" });
      return;
    }
    if (!message?.trim()) {
      res.status(400).json({ ok: false, error: "Message is required" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE time_greetings SET time_of_day=$1, message=$2, is_active=$3, sort_rank=$4
       WHERE id=$5 RETURNING *`,
      [timeOfDay, message.trim(), isActive ?? true, sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Greeting not found" });
      return;
    }
    res.json({ ok: true, greeting: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("greetings PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update greeting" });
  }
});

/** DELETE /api/greetings/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM time_greetings WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("greetings DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete greeting" });
  }
});

export default router;
