/**
 * Time Greetings routes — Good morning/afternoon/evening/night messages
 * 
 * 🔒 SECURITY UPDATE: All routes now require user authentication
 * and filter data by user_id to prevent data leakage.
 * 
 * GET /api/greetings/current  — requires user auth, returns only user's greetings
 * GET /api/greetings          — admin only, returns admin user's greetings
 * POST /api/greetings         — admin only
 * PUT /api/greetings/:id      — admin only
 * DELETE /api/greetings/:id   — admin only
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds } from "../utils/tenant.js";

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

/**
 * GET /api/greetings/current
 * 🔒 NOW REQUIRES AUTH - Returns greeting created by PARTNER (not self)
 */
router.get("/current", requireUserAuth, async (req: Request, res: Response) => {
  try {
    // Prefer client-supplied timeOfDay (browser local time) over server time
    const clientTimeOfDay = typeof req.query.timeOfDay === "string" ? req.query.timeOfDay : null;
    const validTimes = ["morning", "afternoon", "evening", "night"];
    const timeOfDay = (clientTimeOfDay && validTimes.includes(clientTimeOfDay))
      ? clientTimeOfDay
      : getCurrentTimeOfDay();
    
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const spaceUserIds = await resolveSpaceUserIds(userId);
    
    // Get greetings created by PARTNER only (exclude own greetings)
    const partnerIds = spaceUserIds.filter(id => id !== userId);
    
    if (partnerIds.length === 0) {
      // No partner, show default
      const defaults: Record<string, string> = {
        morning: "Good morning, sunshine! ☀️",
        afternoon: "Hope you're having a wonderful afternoon! 💕",
        evening: "Good evening, beautiful! 🌅",
        night: "Sweet dreams, my love! 🌙",
      };
      res.json({ timeOfDay, message: defaults[timeOfDay] || "Hello! 💕", isDefault: true });
      return;
    }
    
    const placeholders = partnerIds.map((_, i) => `$${i + 2}`).join(',');
    
    // Join with profiles to get creator's name (partner's name)
    const { rows } = await pool.query(
      `SELECT tg.*, p.name as creator_name 
       FROM time_greetings tg
       LEFT JOIN profiles p ON p.user_id = tg.user_id AND p.is_primary = true
       WHERE tg.time_of_day=$1 AND tg.is_active=true AND tg.user_id IN (${placeholders}) 
       ORDER BY tg.sort_rank ASC, tg.created_at ASC`,
      [timeOfDay, ...partnerIds]
    );
    
    if (rows.length === 0) {
      // Default messages if none set by partner
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
    res.json({ 
      ...mapRow(greeting), 
      timeOfDay, 
      isDefault: false,
      creatorName: greeting.creator_name || null
    });
  } catch (err: any) {
    console.error("greetings current GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch greeting" });
  }
});

/**
 * GET /api/greetings
 * Admin gets all greetings for their user account
 * 🔒 NOW FILTERS BY user_id
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const { rows } = await pool.query(
      "SELECT * FROM time_greetings WHERE user_id = $1 ORDER BY time_of_day, sort_rank ASC, created_at ASC",
      [userId]
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("greetings GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch greetings" });
  }
});

/**
 * POST /api/greetings
 * Admin creates greeting for their user account
 * 🔒 NOW INCLUDES user_id in INSERT
 */
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
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO time_greetings (id, user_id, time_of_day, message, is_active, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, userId, timeOfDay, message.trim(), isActive ?? true, sortRank ?? 0]
    );
    res.status(201).json({ ok: true, greeting: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("greetings POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add greeting" });
  }
});

/**
 * PUT /api/greetings/:id
 * Admin updates greeting - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in UPDATE
 */
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
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const { rows } = await pool.query(
      `UPDATE time_greetings SET time_of_day=$1, message=$2, is_active=$3, sort_rank=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [timeOfDay, message.trim(), isActive ?? true, sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Greeting not found or access denied" });
      return;
    }
    res.json({ ok: true, greeting: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("greetings PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update greeting" });
  }
});

/**
 * DELETE /api/greetings/:id
 * Admin deletes greeting - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in DELETE
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const result = await pool.query("DELETE FROM time_greetings WHERE id=$1 AND user_id=$2", [id, userId]);
    
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Greeting not found or access denied" });
      return;
    }
    
    res.json({ ok: true });
  } catch (err: any) {
    console.error("greetings DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete greeting" });
  }
});

export default router;
