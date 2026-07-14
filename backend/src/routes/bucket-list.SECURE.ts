/**
 * Bucket List routes — things you want to do together.
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
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM bucket_list WHERE user_id = $1 ORDER BY sort_rank ASC, created_at ASC",
      [req.userAuth!.userId]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO bucket_list (id, user_id, item, emoji, sort_rank)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, userId, item.trim(), emoji?.trim() || "✨", sortRank ?? 0]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE bucket_list SET item=$1, emoji=$2, sort_rank=$3 WHERE id=$4 AND user_id=$5 RETURNING *`,
      [item.trim(), emoji?.trim() || "✨", sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Item not found or access denied" });
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const { rows: current } = await pool.query(
      "SELECT completed FROM bucket_list WHERE id=$1 AND user_id=$2",
      [id, userId]
    );
    if (current.length === 0) {
      res.status(404).json({ ok: false, error: "Item not found or access denied" });
      return;
    }
    const nowCompleted = !current[0].completed;
    const { rows } = await pool.query(
      `UPDATE bucket_list SET completed=$1, completed_at=$2 WHERE id=$3 AND user_id=$4 RETURNING *`,
      [nowCompleted, nowCompleted ? new Date() : null, id, userId]
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

    const userId = await getAdminUserId();
    if (!userId) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }

    const result = await pool.query("DELETE FROM bucket_list WHERE id=$1 AND user_id=$2", [id, userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Item not found or access denied" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("bucket-list DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete item" });
  }
});

export default router;
