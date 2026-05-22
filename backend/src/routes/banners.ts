/**
 * Hero Banners routes — CRUD.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/banners */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM hero_banners ORDER BY created_at ASC");
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
    const id = `banner-${Date.now()}`;
    await pool.query(
      `INSERT INTO hero_banners (id, title, subtitle, media_url, type, linked_media_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, title.trim(), subtitle || "", mediaUrl, type || "image", linkedMediaId || null]
    );
    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to create banner" });
  }
});

/** DELETE /api/banners/:id (admin only) */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM hero_banners WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to delete banner" });
  }
});

export default router;
