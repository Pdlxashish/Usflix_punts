/**
 * Profiles and My List routes.
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { logActivity } from "../services/activity.js";
import { getRequestUserId, getSpaceUserIdFromRequest } from "../utils/tenant.js";
import { userCanEditProfile } from "../services/invitations.js";

const router = Router();

const PROFILE_COLORS = [
  "bg-blue-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-indigo-500",
];

async function userOwnsProfile(userId: number, profileId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM user_profiles WHERE user_id = $1 AND profile_id = $2",
    [userId, profileId]
  );
  return (rowCount ?? 0) > 0;
}

async function countUserProfiles(userId: number): Promise<number> {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM user_profiles WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.count ?? 0;
}

/** GET /api/profiles - Returns profiles the authenticated user can access */
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.color, p.profile_picture_url, p.avatar_shape, p.birthday,
              p.role, up.is_primary, p.created_at
       FROM profiles p
       JOIN user_profiles up ON up.profile_id = p.id
       WHERE up.user_id = $1
       ORDER BY up.is_primary DESC, p.role ASC, p.created_at ASC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get profiles error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch profiles" });
  }
});

/** POST /api/profiles - Create a profile (partner or custom) */
router.post("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { name, color, avatarShape, role } = req.body;
    const profileRole = role === "partner" ? "partner" : "self";

    if (!name || !String(name).trim()) {
      res.status(400).json({ ok: false, error: "Profile name is required" });
      return;
    }

    if (profileRole === "partner") {
      res.status(400).json({
        ok: false,
        error: "Partner profiles are created when your partner accepts an invitation. Use Add Partner to send an invite.",
      });
      return;
    } else {
      res.status(400).json({
        ok: false,
        error: "Your account profile is created automatically. Use Add Partner to add a second profile.",
      });
      return;
    }

    const profileId = `p-${userId}-${profileRole}-${Date.now()}`;
    const profileColor =
      color && PROFILE_COLORS.includes(color)
        ? color
        : profileRole === "partner"
          ? "bg-rose-500"
          : "bg-blue-500";

    await pool.query(
      `INSERT INTO profiles (id, user_id, name, color, avatar_shape, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        profileId,
        userId,
        String(name).trim(),
        profileColor,
        avatarShape || "circle",
        profileRole,
      ]
    );

    const isPrimary = profileRole === "self";
    await pool.query(
      `INSERT INTO user_profiles (user_id, profile_id, is_primary)
       VALUES ($1, $2, $3)`,
      [userId, profileId, isPrimary]
    );

    res.status(201).json({ ok: true, profile: { id: profileId, role: profileRole } });
  } catch (error) {
    console.error("Create profile error:", error);
    res.status(500).json({ ok: false, error: "Failed to create profile" });
  }
});

/** PATCH /api/profiles/:profileId - Partial update (rename, avatar, etc.) */
router.patch("/:profileId", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const profileId = req.params.profileId as string;

    if (!(await userCanEditProfile(userId, profileId))) {
      res.status(404).json({ ok: false, error: "Profile not found or access denied" });
      return;
    }

    const { name, color, profilePictureUrl, avatarShape, birthday } = req.body;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      if (!String(name).trim()) {
        res.status(400).json({ ok: false, error: "Profile name cannot be empty" });
        return;
      }
      updates.push(`name = $${idx++}`);
      values.push(String(name).trim());
    }
    if (color !== undefined) {
      updates.push(`color = $${idx++}`);
      values.push(color || "bg-blue-500");
    }
    if (profilePictureUrl !== undefined) {
      updates.push(`profile_picture_url = $${idx++}`);
      values.push(profilePictureUrl || null);
    }
    if (avatarShape !== undefined) {
      updates.push(`avatar_shape = $${idx++}`);
      values.push(avatarShape || "square");
    }
    if (birthday !== undefined) {
      let birthdayValue: string | null = null;
      if (birthday !== null && birthday !== "") {
        const parsed = new Date(String(birthday));
        if (Number.isNaN(parsed.getTime())) {
          res.status(400).json({ ok: false, error: "Invalid birthday date." });
          return;
        }
        birthdayValue = parsed.toISOString().slice(0, 10);
      }
      updates.push(`birthday = $${idx++}`);
      values.push(birthdayValue);
    }

    if (updates.length === 0) {
      res.status(400).json({ ok: false, error: "No fields to update" });
      return;
    }

    values.push(profileId);
    await pool.query(
      `UPDATE profiles SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Patch profile error:", error);
    res.status(500).json({ ok: false, error: "Failed to update profile" });
  }
});

/** PUT /api/profiles/:profileId - Full update (backward compatible) */
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

    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    if (!(await userCanEditProfile(userId, req.params.profileId as string))) {
      res.status(404).json({ ok: false, error: "Profile not found or access denied" });
      return;
    }

    const result = await pool.query(
      `UPDATE profiles
       SET name = $1, color = $2, profile_picture_url = $3, avatar_shape = $4, birthday = $5
       WHERE id = $6`,
      [
        name.trim(),
        color || "bg-blue-500",
        profilePictureUrl || null,
        avatarShape || "square",
        birthdayValue,
        req.params.profileId,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Profile not found or access denied" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ ok: false, error: "Failed to update profile" });
  }
});

/** DELETE /api/profiles/:profileId - Remove a profile (guards last profile) */
router.delete("/:profileId", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const profileId = req.params.profileId as string;

    if (!(await userOwnsProfile(userId, profileId))) {
      res.status(404).json({ ok: false, error: "Profile not found or access denied" });
      return;
    }

    const total = await countUserProfiles(userId);
    if (total <= 1) {
      res.status(400).json({ ok: false, error: "Cannot delete your last profile" });
      return;
    }

    await pool.query("DELETE FROM profiles WHERE id = $1 AND user_id = $2", [profileId, userId]);
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ ok: false, error: "Failed to delete profile" });
  }
});

/** GET /api/profiles/:profileId/list */
router.get("/:profileId/list", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const access = await pool.query(
      "SELECT 1 FROM user_profiles WHERE user_id = $1 AND profile_id = $2",
      [userId, req.params.profileId]
    );
    if (access.rowCount === 0) {
      res.status(403).json({ ok: false, error: "Access denied" });
      return;
    }
    const { rows } = await pool.query(
      `SELECT ml.media_id FROM my_list ml
       JOIN media_items mi ON mi.id = ml.media_id
       WHERE ml.profile_id = $1 AND mi.user_id = $2
       ORDER BY ml.added_at ASC`,
      [req.params.profileId, await getSpaceUserIdFromRequest(req)]
    );
    res.json(rows.map((r) => r.media_id));
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch my list" });
  }
});

/** POST /api/profiles/:profileId/list */
router.post("/:profileId/list", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.body;
    if (!mediaId) {
      res.status(400).json({ ok: false, error: "mediaId required" });
      return;
    }
    const userId = getRequestUserId(req)!;
    const access = await pool.query(
      "SELECT 1 FROM user_profiles WHERE user_id = $1 AND profile_id = $2",
      [userId, req.params.profileId]
    );
    if (access.rowCount === 0) {
      res.status(403).json({ ok: false, error: "Access denied" });
      return;
    }
    const spaceUserId = await getSpaceUserIdFromRequest(req);
    const media = await pool.query(
      "SELECT 1 FROM media_items WHERE id = $1 AND user_id = $2",
      [mediaId, spaceUserId]
    );
    if (media.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Media not found" });
      return;
    }
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
router.delete("/:profileId/list/:mediaId", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const access = await pool.query(
      "SELECT 1 FROM user_profiles WHERE user_id = $1 AND profile_id = $2",
      [userId, req.params.profileId]
    );
    if (access.rowCount === 0) {
      res.status(403).json({ ok: false, error: "Access denied" });
      return;
    }
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
