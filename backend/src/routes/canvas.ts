/**
 * Canvas routes — Shared drawing board
 * 
 * 🔒 SECURITY UPDATE: All routes now use couple-based sharing
 * Partners see the same canvas and updates broadcast via WebSocket
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds, resolveCoupleId } from "../utils/tenant.js";
import { broadcastCanvasUpdate } from "../websocket/broadcast.js";

const router = Router();

function migrationError(err: any): string | undefined {
  if (err.code === "42P01") return "Database table missing. Restart backend to create tables.";
  if (err.code === "42703") return "Database column missing. Restart backend to run migrations.";
  return undefined;
}

function mapRow(r: any) {
  return {
    id: r.id,
    profileId: r.profile_id,
    drawingData: r.drawing_data,
    thumbnailUrl: r.thumbnail_url,
    title: r.title,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

/**
 * PATCH /api/canvas/current — save drawing data to active canvas
 * 🔒 Shared between partners - both see and update the same canvas
 */
router.patch("/current", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const { drawingData } = req.body;
    if (!drawingData) {
      res.status(400).json({ ok: false, error: "Drawing data is required" });
      return;
    }

    const userId = req.userAuth!.userId;
    
    // Get space user IDs (both partners share the same canvas)
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 2}`).join(',');
    
    // Try to update the couple's active canvas (belongs to either partner)
    const { rows } = await pool.query(
      `UPDATE canvas_drawings SET drawing_data=$1 
       WHERE is_active=true AND user_id IN (${placeholders}) RETURNING *`,
      [drawingData, ...spaceUserIds]
    );

    if (rows.length > 0) {
      // Broadcast to partner via WebSocket
      const coupleId = await resolveCoupleId(userId);
      if (coupleId) {
        console.log(`[CANVAS] Broadcasting update to partner - userId=${userId}, coupleId=${coupleId}`);
        broadcastCanvasUpdate(coupleId, userId, { drawingData });
      }
      
      res.json({ ok: true, canvas: mapRow(rows[0]) });
      return;
    }

    // No active canvas — create one for this user (first time)
    const id = randomUUID();
    const { rows: newRows } = await pool.query(
      `INSERT INTO canvas_drawings (id, user_id, drawing_data, title, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [id, userId, drawingData, "Shared Canvas"]
    );
    
    // Broadcast to partner
    const coupleId = await resolveCoupleId(userId);
    if (coupleId) {
      console.log(`[CANVAS] Broadcasting new canvas to partner - userId=${userId}, coupleId=${coupleId}`);
      broadcastCanvasUpdate(coupleId, userId, { drawingData });
    }
    
    res.status(201).json({ ok: true, canvas: mapRow(newRows[0]) });
  } catch (err: any) {
    console.error("canvas PATCH current error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to save canvas" });
  }
});

/**
 * GET /api/canvas/current
 * 🔒 NOW REQUIRES AUTH - Returns current active canvas from both partners
 */
router.get("/current", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT * FROM canvas_drawings WHERE is_active = true AND user_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 1`,
      spaceUserIds
    );
    
    if (rows.length === 0) {
      // Return empty canvas data
      res.json({
        id: null,
        drawingData: JSON.stringify({ objects: [], background: "#ffffff" }),
        title: "New Canvas",
        isActive: true,
      });
      return;
    }
    
    res.json(mapRow(rows[0]));
  } catch (err: any) {
    console.error("canvas current GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch canvas" });
  }
});

/**
 * GET /api/canvas
 * Admin gets all saved canvases for their user account
 * 🔒 NOW FILTERS BY user_id
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const { rows } = await pool.query(
      "SELECT * FROM canvas_drawings WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC",
      [userId]
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("canvas GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch canvases" });
  }
});

/**
 * POST /api/canvas
 * Admin creates new canvas for their user account
 * 🔒 NOW INCLUDES user_id in INSERT
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { profileId, drawingData, thumbnailUrl, title } = req.body;
    
    if (!drawingData) {
      res.status(400).json({ ok: false, error: "Drawing data is required" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const id = randomUUID();
    
    // If this is being set as active, unset all others for this user
    const isActive = req.body.isActive ?? false;
    if (isActive) {
      await pool.query("UPDATE canvas_drawings SET is_active = false WHERE user_id = $1", [userId]);
    }
    
    const { rows } = await pool.query(
      `INSERT INTO canvas_drawings (id, user_id, profile_id, drawing_data, thumbnail_url, title, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, userId, profileId || null, drawingData, thumbnailUrl || null, title || "Untitled", isActive]
    );
    
    res.status(201).json({ ok: true, canvas: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("canvas POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to save canvas" });
  }
});

/**
 * PUT /api/canvas/:id
 * Admin updates canvas - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id in UPDATE
 */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { profileId, drawingData, thumbnailUrl, title } = req.body;
    
    if (!drawingData) {
      res.status(400).json({ ok: false, error: "Drawing data is required" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE canvas_drawings 
       SET profile_id=$1, drawing_data=$2, thumbnail_url=$3, title=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [profileId || null, drawingData, thumbnailUrl || null, title || "Untitled", id, userId]
    );
    
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Canvas not found or access denied" });
      return;
    }
    
    res.json({ ok: true, canvas: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("canvas PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update canvas" });
  }
});

/**
 * PATCH /api/canvas/:id/set-active
 * Admin sets canvas as active - only if it belongs to their user account
 * 🔒 NOW FILTERS BY user_id
 */
router.patch("/:id/set-active", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    // Unset all other canvases for this user
    await pool.query("UPDATE canvas_drawings SET is_active = false WHERE user_id = $1", [userId]);
    
    // Set this one as active if it belongs to the user
    const { rows } = await pool.query(
      "UPDATE canvas_drawings SET is_active = true WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, userId]
    );
    
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Canvas not found or access denied" });
      return;
    }
    
    res.json({ ok: true, canvas: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("set-active PATCH error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set active canvas" });
  }
});

/**
 * DELETE /api/canvas/:id
 * Admin deletes canvas - only if it belongs to their user account
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
    
    const result = await pool.query("DELETE FROM canvas_drawings WHERE id=$1 AND user_id=$2", [id, userId]);
    
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Canvas not found or access denied" });
      return;
    }
    
    res.json({ ok: true });
  } catch (err: any) {
    console.error("canvas DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete canvas" });
  }
});

export default router;
