/**
 * Mood Board routes — aesthetic photo gallery (no titles, just vibes).
 * GET /api/mood-board        — public
 * POST /api/mood-board       — admin only
 * PUT /api/mood-board/:id    — admin only
 * DELETE /api/mood-board/:id — admin only
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = Router();

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

/** GET /api/mood-board */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM mood_board ORDER BY sort_rank ASC, created_at DESC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("mood-board GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch mood board" });
  }
});

/** POST /api/mood-board */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { imageUrl, alt, sortRank } = req.body;
    if (!imageUrl?.trim()) {
      res.status(400).json({ ok: false, error: "imageUrl is required" });
      return;
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO mood_board (id, image_url, alt, sort_rank)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, imageUrl.trim(), alt?.trim() || "", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, photo: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("mood-board POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add photo" });
  }
});

/** PUT /api/mood-board/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageUrl, alt, sortRank } = req.body;
    if (!imageUrl?.trim()) {
      res.status(400).json({ ok: false, error: "imageUrl is required" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE mood_board SET image_url=$1, alt=$2, sort_rank=$3 WHERE id=$4 RETURNING *`,
      [imageUrl.trim(), alt?.trim() || "", sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Photo not found" });
      return;
    }
    res.json({ ok: true, photo: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("mood-board PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update photo" });
  }
});

/** DELETE /api/mood-board/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM mood_board WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("mood-board DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete photo" });
  }
});

function mapRow(r: any) {
  return {
    id: r.id,
    imageUrl: r.image_url,
    alt: r.alt,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

export default router;
