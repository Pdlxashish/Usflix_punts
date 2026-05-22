/**
 * Profiles and My List routes.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activity.js";

const router = Router();

/** GET /api/profiles */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, color, profile_picture_url, avatar_shape, birthday FROM profiles ORDER BY id ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Get profiles error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch profiles" });
  }
});

/** PUT /api/profiles/:profileId - Update a profile (admin only) */
router.put("/:profileId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, color, profilePictureUrl, avatarShape, birthday } = req.body;
    
    if (!name || !name.trim()) {
      res.status(400).json({ ok: false, error: "Profile name is required" });
      return;
    }

    let birthdayValue: string | null = null;
    if (birthday !== undefined && birthday !== null && birthday !== "") {
      const parsed = new Date(String(birthday));
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({ ok: false, error: "Invalid birthday date." });
        return;
      }
      birthdayValue = parsed.toISOString().slice(0, 10);
    }
    
    // Update profile
    await pool.query(
      `UPDATE profiles 
       SET name = $1, color = $2, profile_picture_url = $3, avatar_shape = $4, birthday = $5
       WHERE id = $6`,
      [
        name.trim(),
        color || "bg-blue-500",
        profilePictureUrl || null,
        avatarShape || "square",
        birthdayValue,
        req.params.profileId
      ]
    );
    
    res.json({ ok: true });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ ok: false, error: "Failed to update profile" });
  }
});

/** GET /api/profiles/:profileId/list */
router.get("/:profileId/list", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT media_id FROM my_list WHERE profile_id = $1 ORDER BY added_at ASC",
      [req.params.profileId]
    );
    res.json(rows.map((r) => r.media_id));
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch my list" });
  }
});

/** POST /api/profiles/:profileId/list */
router.post("/:profileId/list", async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.body;
    if (!mediaId) { res.status(400).json({ ok: false, error: "mediaId required" }); return; }
    await pool.query(
      "INSERT INTO my_list (profile_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.params.profileId, mediaId]
    );
    await logActivity(req, {
      action: "my_list_added",
      profileId: typeof req.params.profileId === "string" ? req.params.profileId : null,
      clientId: req.body.clientId ?? null,
      details: { mediaId },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to add to list" });
  }
});

/** DELETE /api/profiles/:profileId/list/:mediaId */
router.delete("/:profileId/list/:mediaId", async (req: Request, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM my_list WHERE profile_id = $1 AND media_id = $2",
      [req.params.profileId, req.params.mediaId]
    );
    await logActivity(req, {
      action: "my_list_removed",
      profileId: typeof req.params.profileId === "string" ? req.params.profileId : null,
      clientId: typeof req.query.clientId === "string" ? req.query.clientId : null,
      details: { mediaId: req.params.mediaId },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to remove from list" });
  }
});

export default router;
