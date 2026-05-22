/**
 * Activity routes — log viewer actions, admin activity dashboard.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { getActivitySummary, logActivity, upsertProfileSession } from "../services/activity.js";

const router = Router();

const ALLOWED_ACTIONS = new Set([
  "profile_selected",
  "profile_heartbeat",
  "my_list_added",
  "my_list_removed",
  "comment_added",
  "comment_deleted",
  "media_viewed",
  "location_shared",
]);

/**
 * POST /api/activity/log
 * Body: { profileId?, action, details?, clientId? }
 */
router.post("/log", async (req: Request, res: Response) => {
  try {
    const { profileId, action, details, clientId } = req.body;

    if (!action || typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
      res.status(400).json({ ok: false, error: "Invalid action." });
      return;
    }

    if (profileId && typeof profileId === "string") {
      const { rows } = await pool.query("SELECT id FROM profiles WHERE id = $1", [profileId]);
      if (rows.length === 0) {
        res.status(400).json({ ok: false, error: "Unknown profile." });
        return;
      }
    }

    const safeClientId =
      typeof clientId === "string" && clientId.length <= 64 ? clientId : null;

    if (profileId && safeClientId && (action === "profile_selected" || action === "profile_heartbeat")) {
      await upsertProfileSession(req, profileId, safeClientId);
    }

    await logActivity(req, {
      action,
      profileId: profileId ?? null,
      clientId: safeClientId,
      details: typeof details === "object" && details !== null ? details : {},
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Activity log error:", error);
    res.status(500).json({ ok: false, error: "Failed to log activity" });
  }
});

/**
 * GET /api/activity — admin only: active profile sessions + recent activity
 */
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const summary = await getActivitySummary();
    res.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Activity summary error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch activity" });
  }
});

export default router;
