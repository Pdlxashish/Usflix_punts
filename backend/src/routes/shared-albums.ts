/**
 * Shared Albums API Routes
 * Access to media from both partners in a couple.
 */
import { Router, Request, Response } from "express";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import { getSharedMedia } from "../services/shared-albums.js";

const router = Router();

/**
 * GET /api/shared/albums
 * Get shared media items from both partners
 */
router.get("/albums", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as "photo" | "video" | "voice" | undefined;
    const uploader = req.query.uploader as "all" | "self" | "partner" | undefined;

    if (limit > 100) {
      res.status(400).json({ ok: false, error: "Maximum limit is 100" });
      return;
    }

    const result = await getSharedMedia(userId, {
      limit,
      offset,
      type,
      uploaderFilter: uploader,
    });

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Get shared albums error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch shared media" });
  }
});

export default router;
