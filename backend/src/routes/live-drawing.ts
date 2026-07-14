/**
 * Live Drawing API Routes
 * Real-time collaborative drawing canvas.
 */
import { Router, Request, Response } from "express";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import {
  saveDrawingStroke,
  clearCanvas,
  getCanvasDrawings,
} from "../services/live-drawing.js";

const router = Router();

/**
 * GET /api/shared/drawing
 * Get all strokes for the couple's canvas
 */
router.get("/drawing", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const drawings = await getCanvasDrawings(userId);

    res.json({
      ok: true,
      drawings,
    });
  } catch (error) {
    console.error("Get canvas drawings error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch canvas drawings" });
  }
});

/**
 * POST /api/shared/drawing/stroke
 * Add a new stroke to the canvas
 */
router.post("/drawing/stroke", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { points, color, width } = req.body;

    if (!Array.isArray(points) || points.length === 0) {
      res.status(400).json({ ok: false, error: "Points array is required" });
      return;
    }

    if (!color || typeof color !== "string") {
      res.status(400).json({ ok: false, error: "Color is required" });
      return;
    }

    if (typeof width !== "number" || width <= 0) {
      res.status(400).json({ ok: false, error: "Width must be a positive number" });
      return;
    }

    // Validate points structure
    for (const point of points) {
      if (typeof point.x !== "number" || typeof point.y !== "number") {
        res.status(400).json({ ok: false, error: "Each point must have x and y coordinates" });
        return;
      }
    }

    const result = await saveDrawingStroke(userId, {
      points,
      color,
      width,
    });

    if (result.ok) {
      res.json({
        ok: true,
        strokeId: result.strokeId,
      });
    } else {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Save drawing stroke error:", error);
    res.status(500).json({ ok: false, error: "Failed to save drawing stroke" });
  }
});

/**
 * DELETE /api/shared/drawing
 * Clear the entire canvas
 */
router.delete("/drawing", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const result = await clearCanvas(userId);

    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Clear canvas error:", error);
    res.status(500).json({ ok: false, error: "Failed to clear canvas" });
  }
});

export default router;
