/**
 * Love Jar routes — reasons why you love her.
 * GET /api/love-jar         — public
 * GET /api/love-jar/random  — public, returns one random reason
 * POST /api/love-jar        — admin only
 * PUT /api/love-jar/:id     — admin only
 * DELETE /api/love-jar/:id  — admin only
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

/** GET /api/love-jar */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM love_jar ORDER BY sort_rank ASC, created_at ASC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("love-jar GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch love jar" });
  }
});

/** GET /api/love-jar/random */
router.get("/random", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM love_jar ORDER BY RANDOM() LIMIT 1"
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "No reasons yet" });
      return;
    }
    res.json(mapRow(rows[0]));
  } catch (err: any) {
    console.error("love-jar random error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch random reason" });
  }
});

/** POST /api/love-jar */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { reason, emoji, sortRank } = req.body;
    if (!reason?.trim()) {
      res.status(400).json({ ok: false, error: "reason is required" });
      return;
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO love_jar (id, reason, emoji, sort_rank)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, reason.trim(), emoji?.trim() || "💕", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, reason: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("love-jar POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add reason" });
  }
});

/** PUT /api/love-jar/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, emoji, sortRank } = req.body;
    if (!reason?.trim()) {
      res.status(400).json({ ok: false, error: "reason is required" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE love_jar SET reason=$1, emoji=$2, sort_rank=$3 WHERE id=$4 RETURNING *`,
      [reason.trim(), emoji?.trim() || "💕", sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Reason not found" });
      return;
    }
    res.json({ ok: true, reason: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("love-jar PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update reason" });
  }
});

/** DELETE /api/love-jar/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM love_jar WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("love-jar DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete reason" });
  }
});

function mapRow(r: any) {
  return {
    id: r.id,
    reason: r.reason,
    emoji: r.emoji,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

export default router;
