/**
 * Bucket List routes — things you want to do together.
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { randomUUID } from "crypto";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds, resolveCoupleId } from "../utils/tenant.js";
import { 
  broadcastBucketListToggled,
  broadcastBucketListAdded,
  broadcastBucketListUpdated,
  broadcastBucketListDeleted
} from "../websocket/broadcast.js";

const router = Router();

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

function mapRow(r: any) {
  return {
    id: r.id,
    item: r.item,
    emoji: r.emoji,
    completed: r.completed,
    completedAt: r.completed_at,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

/** GET /api/bucket-list */
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
      `SELECT * FROM bucket_list WHERE user_id IN (${placeholders}) ORDER BY sort_rank ASC, created_at ASC`,
      spaceUserIds
    );
    res.json(rows.map(mapRow));
  } catch (err: any) {
    console.error("bucket-list GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch bucket list" });
  }
});

/** POST /api/bucket-list */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { item, emoji, sortRank } = req.body;
    if (!item?.trim()) {
      res.status(400).json({ ok: false, error: "item is required" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO bucket_list (id, user_id, item, emoji, sort_rank)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, userId, item.trim(), emoji?.trim() || "✨", sortRank ?? 0]
    );
    
    const newItem = mapRow(rows[0]);
    
    // Broadcast to partner
    const coupleId = await resolveCoupleId(userId);
    if (coupleId) {
      broadcastBucketListAdded(coupleId, userId, {
        id: newItem.id,
        item: newItem.item,
        emoji: newItem.emoji,
        completed: newItem.completed,
        sortRank: newItem.sortRank,
      });
    }
    
    res.status(201).json({ ok: true, item: newItem });
  } catch (err: any) {
    console.error("bucket-list POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to add item" });
  }
});

/** PUT /api/bucket-list/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { item, emoji, sortRank } = req.body;
    if (!item?.trim()) {
      res.status(400).json({ ok: false, error: "item is required" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    // Get space user IDs (both partners can edit each other's items)
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 5}`).join(',');
    
    const { rows } = await pool.query(
      `UPDATE bucket_list SET item=$1, emoji=$2, sort_rank=$3 WHERE id=$4 AND user_id IN (${placeholders}) RETURNING *`,
      [item.trim(), emoji?.trim() || "✨", sortRank ?? 0, id, ...spaceUserIds]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Item not found or access denied" });
      return;
    }
    
    const updatedItem = mapRow(rows[0]);
    
    // Broadcast to partner
    const coupleId = await resolveCoupleId(userId);
    if (coupleId) {
      broadcastBucketListUpdated(coupleId, userId, {
        id: updatedItem.id,
        item: updatedItem.item,
        emoji: updatedItem.emoji,
        sortRank: updatedItem.sortRank,
      });
    }
    
    res.json({ ok: true, item: updatedItem });
  } catch (err: any) {
    console.error("bucket-list PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update item" });
  }
});

/** PATCH /api/bucket-list/:id/toggle — toggle completed status */
router.patch("/:id/toggle", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    // Get space user IDs (both partners can toggle each other's items)
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 2}`).join(',');
    
    // Check if item exists and belongs to this couple
    const { rows: current } = await pool.query(
      `SELECT completed, user_id FROM bucket_list WHERE id=$1 AND user_id IN (${placeholders})`,
      [id, ...spaceUserIds]
    );
    if (current.length === 0) {
      res.status(404).json({ ok: false, error: "Item not found or access denied" });
      return;
    }
    
    const originalOwnerId = current[0].user_id;
    const nowCompleted = !current[0].completed;
    const completedAt = nowCompleted ? new Date() : null;
    
    // Update the item (use original owner's user_id to maintain ownership)
    const { rows } = await pool.query(
      `UPDATE bucket_list SET completed=$1, completed_at=$2 WHERE id=$3 RETURNING *`,
      [nowCompleted, completedAt, id]
    );
    
    const updatedItem = mapRow(rows[0]);
    
    // Broadcast to partner - THIS IS THE KEY CHANGE FOR REAL-TIME UPDATES
    const coupleId = await resolveCoupleId(userId);
    console.log(`[BUCKET-LIST TOGGLE] userId=${userId}, coupleId=${coupleId}, itemId=${updatedItem.id}, completed=${updatedItem.completed}`);
    
    if (coupleId) {
      console.log(`[BUCKET-LIST TOGGLE] Broadcasting to partner in couple: ${coupleId}`);
      broadcastBucketListToggled(coupleId, userId, {
        id: updatedItem.id,
        completed: updatedItem.completed,
        completedAt: updatedItem.completedAt,
      });
      console.log(`[BUCKET-LIST TOGGLE] Broadcast completed`);
    } else {
      console.warn(`[BUCKET-LIST TOGGLE] ⚠️ No coupleId found for userId=${userId}, cannot broadcast!`);
    }
    
    res.json({ ok: true, item: updatedItem });
  } catch (err: any) {
    console.error("bucket-list PATCH toggle error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to toggle item" });
  }
});

/** DELETE /api/bucket-list/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    // Get space user IDs (both partners can delete each other's items)
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 2}`).join(',');
    
    const result = await pool.query(
      `DELETE FROM bucket_list WHERE id=$1 AND user_id IN (${placeholders})`,
      [id, ...spaceUserIds]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Item not found or access denied" });
      return;
    }
    
    // Broadcast to partner
    const coupleId = await resolveCoupleId(userId);
    if (coupleId) {
      broadcastBucketListDeleted(coupleId, userId, id);
    }
    
    res.json({ ok: true });
  } catch (err: any) {
    console.error("bucket-list DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete item" });
  }
});

export default router;
