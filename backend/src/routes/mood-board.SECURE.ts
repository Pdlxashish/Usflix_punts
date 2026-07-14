/**
 * Mood Board routes — aesthetic photo gallery (no titles, just vibes).
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { randomUUID } from "crypto";

const router = Router();

async function getAdminUserId(): Promise<number | null> {
  const { rows } = await pool.query("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
  return rows.length > 0 ? rows[0].id : null;
}

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

/** GET /api/mood-board */
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM mood_board WHERE user_id = $1 ORDER BY sort_rank ASC, created_at DESC",
      [req.userAuth!.userId]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO mood_board (id, user_id, image_url, alt, sort_rank)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, userId, imageUrl.trim(), alt?.trim() || "", sortRank ?? 0]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE mood_board SET image_url=$1, alt=$2, sort_rank=$3 WHERE id=$4 AND user_id=$5 RETURNING *`,
      [imageUrl.trim(), alt?.trim() || "", sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Photo not found or access denied" });
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const result = await pool.query("DELETE FROM mood_board WHERE id=$1 AND user_id=$2", [id, userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Photo not found or access denied" });
      return;
    }
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
