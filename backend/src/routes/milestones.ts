/**
 * Milestones routes — "First Time We..." timeline.
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds } from "../utils/tenant.js";
import { randomUUID } from "crypto";

const router = Router();

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

/** GET /api/milestones */
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
      `SELECT * FROM milestones WHERE user_id IN (${placeholders}) ORDER BY milestone_date ASC`,
      spaceUserIds
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("milestones GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch milestones" });
  }
});

/** POST /api/milestones */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, story, date, imageUrl, emoji } = req.body;
    if (!title?.trim() || !date?.trim()) {
      res.status(400).json({ ok: false, error: "title and date are required" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO milestones (id, user_id, title, story, milestone_date, image_url, emoji)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, userId, title.trim(), story?.trim() || "", date.trim(), imageUrl?.trim() || "", emoji?.trim() || "💕"]
    );
    res.status(201).json({ ok: true, milestone: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("milestones POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to create milestone" });
  }
});

/** PUT /api/milestones/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, story, date, imageUrl, emoji } = req.body;
    if (!title?.trim() || !date?.trim()) {
      res.status(400).json({ ok: false, error: "title and date are required" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE milestones SET title=$1, story=$2, milestone_date=$3, image_url=$4, emoji=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [title.trim(), story?.trim() || "", date.trim(), imageUrl?.trim() || "", emoji?.trim() || "💕", id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Milestone not found or access denied" });
      return;
    }
    res.json({ ok: true, milestone: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("milestones PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update milestone" });
  }
});

/** DELETE /api/milestones/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const result = await pool.query("DELETE FROM milestones WHERE id=$1 AND user_id=$2", [id, userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Milestone not found or access denied" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("milestones DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete milestone" });
  }
});

function mapRow(r: any) {
  return {
    id: r.id,
    title: r.title,
    story: r.story,
    date: r.milestone_date,
    imageUrl: r.image_url,
    emoji: r.emoji,
    createdAt: r.created_at,
  };
}

export default router;
