/**
 * Content routes — Collections and Media Items CRUD.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── Collections ──────────────────────────────────────────────────────────────

/** GET /api/collections — List all collections */
router.get("/collections", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, description, parent_id, sort_rank FROM collections ORDER BY sort_rank ASC"
    );
    const collections = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      parentId: r.parent_id || undefined,
      sortRank: r.sort_rank,
    }));
    res.json(collections);
  } catch (error) {
    console.error("Get collections error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch collections" });
  }
});

/** POST /api/collections — Create a collection (admin only) */
router.post("/collections", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ ok: false, error: "Collection name cannot be empty." });
      return;
    }
    if (name.length > 200) {
      res.status(400).json({ ok: false, error: "Collection name must be 200 characters or fewer." });
      return;
    }
    if (description && description.length > 2000) {
      res.status(400).json({ ok: false, error: "Description must be 2,000 characters or fewer." });
      return;
    }

    // Check nesting depth
    if (parentId) {
      let depth = 0;
      let currentId: string | null = parentId;
      while (currentId) {
        depth++;
        if (depth > 2) {
          res.status(400).json({ ok: false, error: "Cannot nest beyond 3 levels." });
          return;
        }
        const { rows } = await pool.query("SELECT parent_id FROM collections WHERE id = $1", [currentId]);
        currentId = rows[0]?.parent_id || null;
      }
    }

    const id = `c-${Date.now()}`;
    const { rows: countRows } = await pool.query("SELECT COUNT(*) as count FROM collections");
    const sortRank = parseInt(countRows[0].count) + 1;

    await pool.query(
      "INSERT INTO collections (id, name, description, parent_id, sort_rank) VALUES ($1, $2, $3, $4, $5)",
      [id, name.trim(), description?.trim() || null, parentId || null, sortRank]
    );

    res.json({ ok: true, id });
  } catch (error) {
    console.error("Create collection error:", error);
    res.status(500).json({ ok: false, error: "Failed to create collection" });
  }
});

/** PUT /api/collections/:id — Update a collection (admin only) */
router.put("/collections/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (name !== undefined && !name.trim()) {
      res.status(400).json({ ok: false, error: "Collection name cannot be empty." });
      return;
    }
    if (name && name.length > 200) {
      res.status(400).json({ ok: false, error: "Collection name must be 200 characters or fewer." });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description.trim());
    }

    if (updates.length === 0) {
      res.status(400).json({ ok: false, error: "No fields to update." });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE collections SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Update collection error:", error);
    res.status(500).json({ ok: false, error: "Failed to update collection" });
  }
});

/** DELETE /api/collections/:id — Delete a collection (admin only) */
router.delete("/collections/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mode } = req.query; // "delete-items" or "move-to-parent"

    const { rows: colRows } = await pool.query("SELECT * FROM collections WHERE id = $1", [id]);
    if (colRows.length === 0) {
      res.status(404).json({ ok: false, error: "Collection not found." });
      return;
    }

    const col = colRows[0];
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (mode === "delete-items") {
        await client.query("DELETE FROM media_items WHERE LOWER(category) = LOWER($1)", [col.name]);
      } else {
        // Move items to parent collection or "Uncategorized"
        let targetCategory = "Uncategorized";
        if (col.parent_id) {
          const { rows: parentRows } = await client.query("SELECT name FROM collections WHERE id = $1", [col.parent_id]);
          if (parentRows.length > 0) targetCategory = parentRows[0].name;
        }
        await client.query(
          "UPDATE media_items SET category = $1 WHERE LOWER(category) = LOWER($2)",
          [targetCategory, col.name]
        );
      }

      // Reassign child collections to parent
      await client.query(
        "UPDATE collections SET parent_id = $1 WHERE parent_id = $2",
        [col.parent_id || null, id]
      );

      await client.query("DELETE FROM collections WHERE id = $1", [id]);
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete collection error:", error);
    res.status(500).json({ ok: false, error: "Failed to delete collection" });
  }
});

// ─── Media Items ──────────────────────────────────────────────────────────────

/** POST /api/media — Create a media item (admin only) */
router.post("/media", requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      id, type, title, year, tagline, description, 
      thumbnail, category, sortRank, videoUrl, audioUrl, duration, 
      photos, status 
    } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ ok: false, error: "Title is required." });
      return;
    }

    const { rows: countRows } = await pool.query("SELECT COUNT(*) as count FROM media_items");
    const rank = sortRank ?? (parseInt(countRows[0].count) + 1);

    await pool.query(
      `INSERT INTO media_items (
        id, type, title, year, tagline, description, 
        thumbnail, category, sort_rank, video_url, audio_url, duration, 
        photos, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id || `m-${Date.now()}`,
        type || 'photo',
        title.trim(),
        year || new Date().getFullYear().toString(),
        tagline || '',
        description || '',
        thumbnail || null,
        category || 'Uncategorized',
        rank,
        videoUrl || null,
        audioUrl || null,
        duration || null,
        JSON.stringify(photos || []),
        status || 'ready'
      ]
    );

    res.json({ ok: true, id: id || `m-${Date.now()}` });
  } catch (error) {
    console.error("Create media error:", error);
    res.status(500).json({ ok: false, error: "Failed to create media item" });
  }
});

/** GET /api/media — List all media items */
router.get("/media", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM media_items ORDER BY sort_rank ASC"
    );
    const items = rows.map((r) => {
      // Format photos array to match frontend expectations
      let photos = r.photos || [];
      if (Array.isArray(photos) && photos.length > 0) {
        // If photos are just strings, convert to objects with src and caption
        if (typeof photos[0] === 'string') {
          photos = photos.map((url: string) => ({
            src: url,
            caption: r.title || ''
          }));
        }
      }
      
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        year: r.year,
        tagline: r.tagline,
        description: r.description,
        thumbnail: r.thumbnail || undefined,
        category: r.category,
        sortRank: r.sort_rank,
        videoUrl: r.video_url || undefined,
        audioUrl: r.audio_url || undefined,
        duration: r.duration || undefined,
        photos: photos,
        status: r.status,
        featured: r.featured || false,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      };
    });
    res.json(items);
  } catch (error) {
    console.error("Get media error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch media items" });
  }
});

/** GET /api/media/:id — Get single media item */
router.get("/media/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM media_items WHERE id = $1", [req.params.id]);
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Media item not found" });
      return;
    }
    const r = rows[0];
    
    // Format photos array to match frontend expectations
    let photos = r.photos || [];
    if (Array.isArray(photos) && photos.length > 0) {
      // If photos are just strings, convert to objects with src and caption
      if (typeof photos[0] === 'string') {
        photos = photos.map((url: string) => ({
          src: url,
          caption: r.title || ''
        }));
      }
    }
    
    res.json({
      id: r.id, type: r.type, title: r.title, year: r.year,
      tagline: r.tagline, description: r.description,
      thumbnail: r.thumbnail || undefined, category: r.category,
      sortRank: r.sort_rank, videoUrl: r.video_url || undefined,
      audioUrl: r.audio_url || undefined,
      duration: r.duration || undefined, photos: photos,
      status: r.status,
      featured: r.featured || false,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    });
  } catch (error) {
    console.error("Get media item error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch media item" });
  }
});

/** PUT /api/media/:id — Update a media item (admin only) */
router.put("/media/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, tagline, thumbnail, sortRank, category, photos, videoUrl, featured } = req.body;

    if (title !== undefined && !title.trim()) {
      res.status(400).json({ ok: false, error: "Title cannot be empty." });
      return;
    }
    if (title && title.length > 200) {
      res.status(400).json({ ok: false, error: "Title must be 200 characters or fewer." });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title.trim()); }
    if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description.trim()); }
    if (tagline !== undefined) { updates.push(`tagline = $${i++}`); values.push(tagline.trim()); }
    if (thumbnail !== undefined) { updates.push(`thumbnail = $${i++}`); values.push(thumbnail); }
    if (sortRank !== undefined) { updates.push(`sort_rank = $${i++}`); values.push(sortRank); }
    if (category !== undefined) { updates.push(`category = $${i++}`); values.push(category); }
    if (photos !== undefined) { updates.push(`photos = $${i++}`); values.push(JSON.stringify(photos)); }
    if (videoUrl !== undefined) { updates.push(`video_url = $${i++}`); values.push(videoUrl); }
    if (featured !== undefined) { updates.push(`featured = $${i++}`); values.push(featured); }

    if (updates.length === 0) {
      res.status(400).json({ ok: false, error: "No fields to update." });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE media_items SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Update media error:", error);
    res.status(500).json({ ok: false, error: "Failed to update media item" });
  }
});

/** DELETE /api/media/:id — Delete a media item (admin only) */
router.delete("/media/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT id FROM media_items WHERE id = $1", [id]);
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Media item not found." });
      return;
    }

    await pool.query("DELETE FROM media_items WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({ ok: false, error: "Failed to delete media item" });
  }
});

/** POST /api/media/:mediaId/move — Move media to a collection (admin only) */
router.post("/media/:mediaId/move", requireAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { collectionId } = req.body;

    const { rows: colRows } = await pool.query("SELECT name FROM collections WHERE id = $1", [collectionId]);
    if (colRows.length === 0) {
      res.status(404).json({ ok: false, error: "Target collection does not exist." });
      return;
    }

    await pool.query("UPDATE media_items SET category = $1 WHERE id = $2", [colRows[0].name, mediaId]);
    res.json({ ok: true });
  } catch (error) {
    console.error("Move media error:", error);
    res.status(500).json({ ok: false, error: "Failed to move media item" });
  }
});

export default router;
