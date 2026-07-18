/**
 * Data Sync API Routes
 * Endpoints to sync existing data for linked partners.
 */
import { Router, Request, Response } from "express";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import {
  manualSyncForCouple,
  syncAllExistingCouples,
} from "../services/sync-existing-data.js";
import pool from "../db/connection.js";

const router = Router();

/**
 * POST /api/sync/my-data
 * Sync existing data for the current user's couple
 */
router.post("/my-data", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;

    // Get user's couple_id
    const userResult = await pool.query(
      `SELECT couple_id FROM profiles WHERE user_id = $1 AND is_primary = true LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ ok: false, error: "User profile not found" });
      return;
    }

    const coupleId = userResult.rows[0].couple_id;

    if (!coupleId) {
      res.status(400).json({ ok: false, error: "User is not linked to a partner" });
      return;
    }

    // Perform sync
    const result = await manualSyncForCouple(coupleId);

    if (result.ok) {
      res.json({
        ok: true,
        message: "Data synced successfully",
        mediaItemsUpdated: result.mediaItemsUpdated,
        collectionsUpdated: result.collectionsUpdated,
        canvasDrawingsUpdated: result.canvasDrawingsUpdated,
      });
    } else {
      res.status(500).json({
        ok: false,
        error: result.error || "Failed to sync data",
      });
    }
  } catch (error) {
    console.error("Sync my data error:", error);
    res.status(500).json({ ok: false, error: "Failed to sync data" });
  }
});

/**
 * POST /api/sync/all-couples
 * Admin endpoint: Sync data for all existing couples
 * Note: This should be protected with admin authentication in production
 */
router.post("/all-couples", async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check here
    const result = await syncAllExistingCouples();

    res.status(result.ok ? 200 : 500).json({
      ...result,
      message: result.ok ? "Sync completed for all couples" : "Sync failed for all couples",
    });
  } catch (error) {
    console.error("Sync all couples error:", error);
    res.status(500).json({ ok: false, error: "Failed to sync all couples" });
  }
});

export default router;
