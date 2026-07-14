/**
 * Hero Banners routes — CRUD.
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds } from "../utils/tenant.js";

const router = Router();

/** GET /api/banners */
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
      `SELECT * FROM hero_banners WHERE user_id IN (${placeholders}) ORDER BY created_at ASC`,
      spaceUserIds
    );
    res.json(rows.map((r) => ({
      id: r.id, title: r.title, subtitle: r.subtitle,
      mediaUrl: r.media_url, type: r.type,
      linkedMediaId: r.linked_media_id ?? undefined,
    })));
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch banners" });
  }
});

/** POST /api/banners (admin only) */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, subtitle, mediaUrl, type, linkedMediaId } = req.body;
    if (!title?.trim()) { res.status(400).json({ ok: false, error: "Title required." }); return; }
    if (!mediaUrl) { res.status(400).json({ ok: false, error: "Media file required." }); return; }

    const spaceUserId = await getSpaceUserIdFromRequest(req);
    if (!spaceUserId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const id = `banner-${Date.now()}`;
    await pool.query(
      `INSERT INTO hero_banners (id, user_id, title, subtitle, media_url, type, linked_media_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, spaceUserId, title.trim(), subtitle || "", mediaUrl, type || "image", linkedMediaId || null]
    );
    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to create banner" });
  }
});

/** DELETE /api/banners/:id (admin only) */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const spaceUserId = await getSpaceUserIdFromRequest(req);
    if (!spaceUserId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const result = await pool.query("DELETE FROM hero_banners WHERE id = $1 AND user_id = $2", [req.params.id, spaceUserId]);
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Banner not found or access denied" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to delete banner" });
  }
});

export default router;
