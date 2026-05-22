/**
 * Comments routes — CRUD for media comments.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { logActivity } from "../services/activity.js";

const router = Router();

/** GET /api/comments?mediaId=xxx */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.query;
    let query = "SELECT * FROM comments";
    const params: any[] = [];
    if (mediaId) { query += " WHERE media_id = $1"; params.push(mediaId); }
    query += " ORDER BY timestamp ASC";
    const { rows } = await pool.query(query, params);
    res.json(rows.map((r) => ({
      id: r.id, mediaId: r.media_id, profileId: r.profile_id,
      text: r.text, timestamp: parseInt(r.timestamp),
      videoTime: r.video_time ?? undefined,
    })));
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch comments" });
  }
});

/** POST /api/comments */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { mediaId, profileId, text, videoTime } = req.body;
    if (!mediaId || !profileId || !text?.trim()) {
      res.status(400).json({ ok: false, error: "mediaId, profileId, and text are required." });
      return;
    }
    const id = `comment-${Date.now()}`;
    const timestamp = Date.now();
    await pool.query(
      `INSERT INTO comments (id, media_id, profile_id, text, timestamp, video_time) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, mediaId, profileId, text.trim(), timestamp, videoTime ?? null]
    );
    await logActivity(req, {
      action: "comment_added",
      profileId,
      clientId: req.body.clientId ?? null,
      details: { mediaId, commentId: id, text: text.trim().slice(0, 200), videoTime: videoTime ?? null },
    });
    res.json({ ok: true, id, timestamp });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to create comment" });
  }
});

/** DELETE /api/comments/:id */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT profile_id, media_id FROM comments WHERE id = $1",
      [req.params.id]
    );
    await pool.query("DELETE FROM comments WHERE id = $1", [req.params.id]);
    if (rows.length > 0) {
      await logActivity(req, {
        action: "comment_deleted",
        profileId: rows[0].profile_id,
        clientId: typeof req.query.clientId === "string" ? req.query.clientId : null,
        details: { mediaId: rows[0].media_id, commentId: req.params.id },
      });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to delete comment" });
  }
});

export default router;
