/**
 * Partner Linking API Routes
 * Handles partner search, link status, and unlinking.
 */
import { Router, Request, Response } from "express";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import {
  searchPartners,
  getLinkStatus,
  unlinkPartners,
} from "../services/partner-linking.js";

const router = Router();

/**
 * POST /api/partner/search
 * Search for partners by username or email
 */
router.post("/search", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { query } = req.body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      res.status(400).json({ ok: false, error: "Search query must be at least 2 characters" });
      return;
    }

    const results = await searchPartners(query.trim(), userId, 10);

    res.json({
      ok: true,
      results: results.map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        email: r.email,
        profilePicture: r.profile_picture_url,
      })),
    });
  } catch (error) {
    console.error("Partner search error:", error);
    res.status(500).json({ ok: false, error: "Failed to search for partners" });
  }
});

/**
 * GET /api/partner/link/status
 * Get current link status for the authenticated user
 */
router.get("/link/status", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const status = await getLinkStatus(userId);

    res.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    console.error("Get link status error:", error);
    res.status(500).json({ ok: false, error: "Failed to get link status" });
  }
});

/**
 * POST /api/partner/link/unlink
 * Unlink from current partner
 */
router.post("/link/unlink", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { confirmationText } = req.body;

    // Require explicit confirmation
    if (confirmationText !== "UNLINK") {
      res.status(400).json({
        ok: false,
        error: 'You must type "UNLINK" to confirm this action',
      });
      return;
    }

    const result = await unlinkPartners(userId);

    res.json({
      ok: true,
      message: "Successfully unlinked from partner",
      coupleId: result.coupleId,
    });
  } catch (error) {
    console.error("Unlink partners error:", error);
    const message = error instanceof Error ? error.message : "Failed to unlink partners";
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;
