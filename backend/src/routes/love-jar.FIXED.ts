/**
 * Love Jar routes — reasons why you love her.
 * 
 * 🔒 SECURITY UPDATE: All routes now require user authentication
 * and filter data by user_id to prevent data leakage.
 * 
 * GET /api/love-jar         — requires user auth, returns only user's reasons
 * GET /api/love-jar/random  — requires user auth, returns random from user's reasons
 * POST /api/love-jar        — admin only (creates for admin's user account)
 * PUT /api/love-jar/:id     — admin only (updates only if owned by admin's user)
 * DELETE /api/love-jar/:id  — admin only (deletes only if owned by admin's user)
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { randomUUID } from "crypto";

const router = Router();

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

/**
 * GET /api/love-jar
 * 🔒 NOW REQUIRES AUTH - Returns only the authenticated user's love jar entries
 */
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM love_jar WHERE user_id = $1 ORDER BY sort_rank ASC, created_at ASC",
      [req.userAuth!.userId]
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("love-jar GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch love jar" });
  }
});

/**
 * GET /api/love-jar/random
 * 🔒 NOW REQUIRES AUTH - Returns random entry from authenticated user's love jar
 */
router.get("/random", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM love_jar WHERE user_id = $1 ORDER BY RANDOM() LIMIT 1",
      [req.userAuth!.userId]
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

/**
 * POST /api/love-jar
 * Admin creates love jar entry for their user account
 * 🔒 NOW INCLUDES user_id in INSERT
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { reason, emoji, sortRank } = req.body;
    if (!reason?.trim()) {
      res.status(400).json({ ok: false, error: "reason is required" });
      return;
    }
    
    // Get the admin user's user account
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR google_id LIKE '%' || $1 || '%' LIMIT 1",
      [req.auth!.username]
    );
    
    if (userResult.rows.length === 0) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }
    
    const userId = userResult.rows[0].id;
    const id = randomUUID();
    
    const { rows } = await pool.query(
      `INSERT INTO love_jar (id, user_id, reason, emoji, sort_rank)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, userId, reason.trim(), emoji?.trim() || "💕", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, reason: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("love-jar POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add reason" });
  }
});

/**
 * PUT /api/love-jar/:id
 * Admin updates love jar entry - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in UPDATE
 */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, emoji, sortRank } = req.body;
    if (!reason?.trim()) {
      res.status(400).json({ ok: false, error: "reason is required" });
      return;
    }
    
    // Get the admin user's user account
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR google_id LIKE '%' || $1 || '%' LIMIT 1",
      [req.auth!.username]
    );
    
    if (userResult.rows.length === 0) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }
    
    const userId = userResult.rows[0].id;
    
    const { rows } = await pool.query(
      `UPDATE love_jar SET reason=$1, emoji=$2, sort_rank=$3 
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [reason.trim(), emoji?.trim() || "💕", sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Reason not found or access denied" });
      return;
    }
    res.json({ ok: true, reason: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("love-jar PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update reason" });
  }
});

/**
 * DELETE /api/love-jar/:id
 * Admin deletes love jar entry - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in DELETE
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the admin user's user account
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR google_id LIKE '%' || $1 || '%' LIMIT 1",
      [req.auth!.username]
    );
    
    if (userResult.rows.length === 0) {
      res.status(500).json({ ok: false, error: "Admin user account not found" });
      return;
    }
    
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      "DELETE FROM love_jar WHERE id=$1 AND user_id=$2",
      [id, userId]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Reason not found or access denied" });
      return;
    }
    
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
