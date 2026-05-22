/**
 * Milestones routes — "First Time We..." timeline.
 * GET /api/milestones        — public
 * POST /api/milestones       — admin only
 * PUT /api/milestones/:id    — admin only
 * DELETE /api/milestones/:id — admin only
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

/** GET /api/milestones */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM milestones ORDER BY milestone_date ASC"
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
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO milestones (id, title, story, milestone_date, image_url, emoji)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, title.trim(), story?.trim() || "", date.trim(), imageUrl?.trim() || "", emoji?.trim() || "💕"]
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
    const { rows } = await pool.query(
      `UPDATE milestones SET title=$1, story=$2, milestone_date=$3, image_url=$4, emoji=$5
       WHERE id=$6 RETURNING *`,
      [title.trim(), story?.trim() || "", date.trim(), imageUrl?.trim() || "", emoji?.trim() || "💕", id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Milestone not found" });
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
    await pool.query("DELETE FROM milestones WHERE id=$1", [id]);
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
