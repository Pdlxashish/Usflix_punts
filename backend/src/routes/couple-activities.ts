/**
 * Couple Activities API Routes
 * Romance activities, streaks, and engagement tracking.
 */
import { Router, Request, Response } from "express";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import {
  completeActivity,
  getTodayActivity,
  getStreaks,
  getActivityHistory,
} from "../services/couple-activities.js";

const router = Router();

/**
 * GET /api/shared/activities
 * Get activities overview with streaks and today's status
 */
router.get("/activities", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const activityType = (req.query.type as string) || "daily";

    const [streaks, todayActivity, history] = await Promise.all([
      getStreaks(userId, activityType),
      getTodayActivity(userId, activityType),
      getActivityHistory(userId, activityType, 7),
    ]);

    res.json({
      ok: true,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      todayActivity,
      recentHistory: history,
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch activities" });
  }
});

/**
 * POST /api/shared/activities/complete
 * Mark today's activity as complete
 */
router.post("/activities/complete", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { activityType, response } = req.body;

    if (!activityType || typeof activityType !== "string") {
      res.status(400).json({ ok: false, error: "Activity type is required" });
      return;
    }

    const result = await completeActivity(userId, activityType, response);

    if (result.ok) {
      res.json({
        ok: true,
        partnerCompleted: result.partnerCompleted,
        bothNowComplete: result.bothNowComplete,
      });
    } else {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Complete activity error:", error);
    res.status(500).json({ ok: false, error: "Failed to complete activity" });
  }
});

/**
 * GET /api/shared/activities/history
 * Get activity history
 */
router.get("/activities/history", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const activityType = (req.query.type as string) || "daily";
    const limit = parseInt(req.query.limit as string) || 30;

    if (limit > 365) {
      res.status(400).json({ ok: false, error: "Maximum limit is 365" });
      return;
    }

    const history = await getActivityHistory(userId, activityType, limit);

    res.json({
      ok: true,
      history,
    });
  } catch (error) {
    console.error("Get activity history error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch activity history" });
  }
});

export default router;
