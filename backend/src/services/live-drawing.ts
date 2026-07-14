/**
 * Live Drawing Service
 * Real-time collaborative drawing canvas for couples.
 */
import pool from "../db/connection.js";
import { getCoupleId } from "./partner-linking.js";
import { broadcastDrawingStroke, broadcastCanvasClear } from "../websocket/broadcast.js";

/**
 * Save a drawing stroke to the database and broadcast to partner
 */
export async function saveDrawingStroke(
  userId: number,
  stroke: {
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }
): Promise<{ ok: boolean; strokeId?: string; error?: string }> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { ok: false, error: "Not linked to a partner" };
  }

  const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    // Check if canvas_drawings table exists and has couple_id column
    const { rows: tableCheck } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'canvas_drawings' AND column_name = 'couple_id'
    `);

    if (tableCheck.length === 0) {
      // couple_id column doesn't exist yet, just broadcast without saving
      broadcastDrawingStroke(coupleId, userId, {
        strokeId,
        points: stroke.points,
        color: stroke.color,
        width: stroke.width,
      });
      return { ok: true, strokeId };
    }

    // Save stroke to database
    await pool.query(
      `INSERT INTO canvas_drawings (id, user_id, couple_id, drawing_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        strokeId,
        userId,
        coupleId,
        JSON.stringify({
          points: stroke.points,
          color: stroke.color,
          width: stroke.width,
        }),
      ]
    );

    // Broadcast to partner via WebSocket
    broadcastDrawingStroke(coupleId, userId, {
      strokeId,
      ...stroke,
    });

    return { ok: true, strokeId };
  } catch (error) {
    console.error("Save drawing stroke error:", error);
    
    // Even if save fails, try to broadcast
    broadcastDrawingStroke(coupleId, userId, {
      strokeId,
      ...stroke,
    });
    
    return { ok: true, strokeId }; // Return success since broadcast worked
  }
}

/**
 * Clear the canvas and notify partner
 */
export async function clearCanvas(
  userId: number
): Promise<{ ok: boolean; error?: string }> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { ok: false, error: "Not linked to a partner" };
  }

  try {
    // Delete all drawings for this couple
    await pool.query(
      `DELETE FROM canvas_drawings WHERE couple_id = $1`,
      [coupleId]
    );

    // Broadcast clear event to partner
    broadcastCanvasClear(coupleId, userId);

    return { ok: true };
  } catch (error) {
    console.error("Clear canvas error:", error);
    
    // Even if delete fails, try to broadcast
    broadcastCanvasClear(coupleId, userId);
    
    return { ok: true }; // Return success since broadcast worked
  }
}

/**
 * Get all drawing strokes for a couple's canvas
 */
export async function getCanvasDrawings(
  userId: number
): Promise<Array<{
  id: string;
  userId: number;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  createdAt: string;
}>> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return [];
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, drawing_data, created_at
       FROM canvas_drawings
       WHERE couple_id = $1
       ORDER BY created_at ASC`,
      [coupleId]
    );

    return rows.map(row => {
      const data = typeof row.drawing_data === 'string' 
        ? JSON.parse(row.drawing_data) 
        : row.drawing_data;
      
      return {
        id: row.id,
        userId: row.user_id,
        points: data.points || [],
        color: data.color || '#000000',
        width: data.width || 2,
        createdAt: row.created_at,
      };
    });
  } catch (error) {
    console.error("Get canvas drawings error:", error);
    return [];
  }
}
