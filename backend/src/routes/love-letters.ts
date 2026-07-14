/**
 * Love Letters routes — CRUD for handwritten-style love notes.
 * 
 * 🔒 SECURITY UPDATE: All routes now require user authentication
 * and filter data by user_id to prevent data leakage.
 * 
 * GET /api/love-letters        — requires user auth, returns only user's letters
 * POST /api/love-letters       — admin only, creates for admin's user account
 * PUT /api/love-letters/:id    — admin only, updates only if owned by admin's user
 * DELETE /api/love-letters/:id — admin only, deletes only if owned by admin's user
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds } from "../utils/tenant.js";
import { randomUUID } from "crypto";

const router = Router();

/**
 * GET /api/love-letters
 * 🔒 NOW REQUIRES AUTH - Returns love letters for both partners
 */
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
      `SELECT * FROM love_letters WHERE user_id IN (${placeholders}) ORDER BY sort_rank ASC, created_at DESC`,
      spaceUserIds
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

/**
 * POST /api/love-letters
 * Admin creates love letter for their user account
 * 🔒 NOW INCLUDES user_id in INSERT
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { from, preview, message, color, sortRank } = req.body;
    if (!from?.trim() || !preview?.trim() || !message?.trim()) {
      res.status(400).json({ ok: false, error: "from, preview, and message are required" });
      return;
    }
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO love_letters (id, user_id, "from", preview, message, color, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, userId, from.trim(), preview.trim(), message.trim(), color || "rose", sortRank ?? 0]
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

/**
 * PUT /api/love-letters/:id
 * Admin updates love letter - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in UPDATE
 */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, preview, message, color, sortRank } = req.body;
    if (!from?.trim() || !preview?.trim() || !message?.trim()) {
      res.status(400).json({ ok: false, error: "from, preview, and message are required" });
      return;
    }
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const { rows } = await pool.query(
      `UPDATE love_letters SET "from"=$1, preview=$2, message=$3, color=$4, sort_rank=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [from.trim(), preview.trim(), message.trim(), color || "rose", sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Letter not found or access denied" });
      return;
    }
    res.json({ ok: true, letter: mapRow(rows[0]) });
  } catch (err) {
    console.error("love-letters PUT error:", err);
    res.status(500).json({ ok: false, error: "Failed to update love letter" });
  }
});

/**
 * DELETE /api/love-letters/:id
 * Admin deletes love letter - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in DELETE
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const result = await pool.query("DELETE FROM love_letters WHERE id=$1 AND user_id=$2", [id, userId]);
    
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Letter not found or access denied" });
      return;
    }
    
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
