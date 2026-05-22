/**
 * Love Letters routes — CRUD for handwritten-style love notes.
 * GET /api/love-letters        — public (anyone can read)
 * POST /api/love-letters       — admin only
 * PUT /api/love-letters/:id    — admin only
 * DELETE /api/love-letters/:id — admin only
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = Router();

/** GET /api/love-letters */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM love_letters ORDER BY sort_rank ASC, created_at DESC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("love-letters GET error:", err);
    const msg = err?.message?.includes("does not exist")
      ? "Table not found — please restart the backend server to run migrations."
      : "Failed to fetch love letters";
    res.status(500).json({ ok: false, error: msg });
  }
});

/** POST /api/love-letters */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { from, preview, message, color, sortRank } = req.body;
    if (!from?.trim() || !preview?.trim() || !message?.trim()) {
      res.status(400).json({ ok: false, error: "from, preview, and message are required" });
      return;
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO love_letters (id, "from", preview, message, color, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, from.trim(), preview.trim(), message.trim(), color || "rose", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, letter: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("love-letters POST error:", err);
    const msg = err?.message?.includes("does not exist")
      ? "Table not found — please restart the backend server to run migrations."
      : "Failed to create love letter";
    res.status(500).json({ ok: false, error: msg });
  }
});

/** PUT /api/love-letters/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, preview, message, color, sortRank } = req.body;
    if (!from?.trim() || !preview?.trim() || !message?.trim()) {
      res.status(400).json({ ok: false, error: "from, preview, and message are required" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE love_letters SET "from"=$1, preview=$2, message=$3, color=$4, sort_rank=$5
       WHERE id=$6 RETURNING *`,
      [from.trim(), preview.trim(), message.trim(), color || "rose", sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Letter not found" });
      return;
    }
    res.json({ ok: true, letter: mapRow(rows[0]) });
  } catch (err) {
    console.error("love-letters PUT error:", err);
    res.status(500).json({ ok: false, error: "Failed to update love letter" });
  }
});

/** DELETE /api/love-letters/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM love_letters WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("love-letters DELETE error:", err);
    res.status(500).json({ ok: false, error: "Failed to delete love letter" });
  }
});

function mapRow(r: any) {
  return {
    id: r.id,
    from: r.from,
    preview: r.preview,
    message: r.message,
    color: r.color,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

export default router;
