/**
 * Hero Banners routes — CRUD.
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";

const router = Router();

async function getAdminUserId(): Promise<number | null> {
  const { rows } = await pool.query("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
  return rows.length > 0 ? rows[0].id : null;
}

/** GET /api/banners */
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM hero_banners WHERE user_id = $1 ORDER BY created_at ASC",
      [req.userAuth!.userId]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const id = `banner-${Date.now()}`;
    await pool.query(
      `INSERT INTO hero_banners (id, user_id, title, subtitle, media_url, type, linked_media_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, userId, title.trim(), subtitle || "", mediaUrl, type || "image", linkedMediaId || null]
    );
    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to create banner" });
  }
});

/** DELETE /api/banners/:id (admin only) */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const result = await pool.query("DELETE FROM hero_banners WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
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
