/**
 * Canvas routes — Shared drawing board
 * GET /api/canvas/stream         — public, SSE stream for live canvas updates
 * GET /api/canvas/current        — public, get current active canvas
 * GET /api/canvas                — admin only, get all saved canvases
 * POST /api/canvas               — admin only, save new canvas
 * PUT /api/canvas/:id            — admin only, update canvas
 * PATCH /api/canvas/:id/set-active — admin only, set as active canvas
 * DELETE /api/canvas/:id         — admin only, delete canvas
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

// ─── SSE broadcaster ──────────────────────────────────────────────────────────
// Keeps a set of active SSE response objects. When the canvas is updated,
// broadcastCanvasUpdate() pushes the new drawing data to every subscriber.

const sseClients = new Set<Response>();

function broadcastCanvasUpdate(drawingData: string) {
  const payload = JSON.stringify({ drawingData });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

const router = Router();

// ─── SSE endpoint ─────────────────────────────────────────────────────────────
/** GET /api/canvas/stream — subscribe to live canvas updates */
router.get("/stream", (req: Request, res: Response) => {
  // Set SSE headers — disable compression so chunks flush immediately
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // nginx: disable proxy buffering
  res.flushHeaders();

  // Register this client
  sseClients.add(res);

  // Send a heartbeat every 25 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25_000);

  // Clean up when the client disconnects
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

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

/** PATCH /api/canvas/current — public, save drawing data to active canvas */
router.patch("/current", async (req: Request, res: Response) => {
  try {
    const { drawingData } = req.body;
    if (!drawingData) {
      res.status(400).json({ ok: false, error: "Drawing data is required" });
      return;
    }

    // Try to update the active canvas
    const { rows } = await pool.query(
      "UPDATE canvas_drawings SET drawing_data=$1 WHERE is_active=true RETURNING *",
      [drawingData]
    );

    if (rows.length > 0) {
      broadcastCanvasUpdate(drawingData);
      res.json({ ok: true, canvas: mapRow(rows[0]) });
      return;
    }

    // No active canvas — create one
    const id = randomUUID();
    const { rows: newRows } = await pool.query(
      `INSERT INTO canvas_drawings (id, drawing_data, title, is_active)
       VALUES ($1, $2, $3, true) RETURNING *`,
      [id, drawingData, "Shared Canvas"]
    );
    broadcastCanvasUpdate(drawingData);
    res.status(201).json({ ok: true, canvas: mapRow(newRows[0]) });
  } catch (err: any) {
    console.error("canvas PATCH current error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to save canvas" });
  }
});

/** GET /api/canvas/current */
router.get("/current", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM canvas_drawings WHERE is_active = true ORDER BY created_at DESC LIMIT 1"
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

/** GET /api/canvas */
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM canvas_drawings ORDER BY is_active DESC, created_at DESC"
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("canvas GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch canvases" });
  }
});

/** POST /api/canvas */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { profileId, drawingData, thumbnailUrl, title } = req.body;
    
    if (!drawingData) {
      res.status(400).json({ ok: false, error: "Drawing data is required" });
      return;
    }

    const id = randomUUID();
    
    // If this is being set as active, unset all others
    const isActive = req.body.isActive ?? false;
    if (isActive) {
      await pool.query("UPDATE canvas_drawings SET is_active = false");
    }
    
    const { rows } = await pool.query(
      `INSERT INTO canvas_drawings (id, profile_id, drawing_data, thumbnail_url, title, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, profileId || null, drawingData, thumbnailUrl || null, title || "Untitled", isActive]
    );
    
    res.status(201).json({ ok: true, canvas: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("canvas POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to save canvas" });
  }
});

/** PUT /api/canvas/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { profileId, drawingData, thumbnailUrl, title } = req.body;
    
    if (!drawingData) {
      res.status(400).json({ ok: false, error: "Drawing data is required" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE canvas_drawings 
       SET profile_id=$1, drawing_data=$2, thumbnail_url=$3, title=$4
       WHERE id=$5 RETURNING *`,
      [profileId || null, drawingData, thumbnailUrl || null, title || "Untitled", id]
    );
    
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Canvas not found" });
      return;
    }
    
    res.json({ ok: true, canvas: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("canvas PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update canvas" });
  }
});

/** PATCH /api/canvas/:id/set-active */
router.patch("/:id/set-active", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Unset all other canvases
    await pool.query("UPDATE canvas_drawings SET is_active = false");
    
    // Set this one as active
    const { rows } = await pool.query(
      "UPDATE canvas_drawings SET is_active = true WHERE id=$1 RETURNING *",
      [id]
    );
    
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Canvas not found" });
      return;
    }
    
    res.json({ ok: true, canvas: mapRow(rows[0]) });
  } catch (err: any) {
    console.error("set-active PATCH error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to set active canvas" });
  }
});

/** DELETE /api/canvas/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM canvas_drawings WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("canvas DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete canvas" });
  }
});

export default router;
