/**
 * Bucket List routes — things you want to do together.
 * GET /api/bucket-list           — public
 * POST /api/bucket-list          — admin only
 * PUT /api/bucket-list/:id       — admin only
 * PATCH /api/bucket-list/:id/toggle — admin only (toggle completed)
 * DELETE /api/bucket-list/:id    — admin only
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

function mapRow(r: any) {
  return {
    id: r.id,
    item: r.item,
    emoji: r.emoji,
    completed: r.completed,
    completedAt: r.completed_at,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

/** GET /api/bucket-list */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM bucket_list ORDER BY sort_rank ASC, created_at ASC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("bucket-list GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch bucket list" });
  }
});

/** POST /api/bucket-list */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { item, emoji, sortRank } = req.body;
    if (!item?.trim()) {
      res.status(400).json({ ok: false, error: "item is required" });
      return;
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO bucket_list (id, item, emoji, sort_rank)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, item.trim(), emoji?.trim() || "✨", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, item: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("bucket-list POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add item" });
  }
});

/** PUT /api/bucket-list/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { item, emoji, sortRank } = req.body;
    if (!item?.trim()) {
      res.status(400).json({ ok: false, error: "item is required" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE bucket_list SET item=$1, emoji=$2, sort_rank=$3 WHERE id=$4 RETURNING *`,
      [item.trim(), emoji?.trim() || "✨", sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Item not found" });
      return;
    }
    res.json({ ok: true, item: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("bucket-list PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update item" });
  }
});

/** PATCH /api/bucket-list/:id/toggle — toggle completed status */
router.patch("/:id/toggle", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows: current } = await pool.query("SELECT completed FROM bucket_list WHERE id=$1", [id]);
    if (current.length === 0) {
      res.status(404).json({ ok: false, error: "Item not found" });
      return;
    }
    const nowCompleted = !current[0].completed;
    const { rows } = await pool.query(
      `UPDATE bucket_list SET completed=$1, completed_at=$2 WHERE id=$3 RETURNING *`,
      [nowCompleted, nowCompleted ? new Date() : null, id]
    );
    res.json({ ok: true, item: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("bucket-list PATCH toggle error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to toggle item" });
  }
});

/** DELETE /api/bucket-list/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM bucket_list WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("bucket-list DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete item" });
  }
});

export default router;
