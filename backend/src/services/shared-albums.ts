/**
 * Shared Albums Service
 * Provides access to media from both partners in a couple.
 */
import pool from "../db/connection.js";
import { getCoupleId, getPartnerUserId } from "./partner-linking.js";
import { broadcastNewMedia } from "../websocket/broadcast.js";

/**
 * Get shared media items for a couple
 */
export async function getSharedMedia(
  userId: number,
  options: {
    limit?: number;
    offset?: number;
    type?: "photo" | "video" | "voice";
    uploaderFilter?: "all" | "self" | "partner";
  } = {}
): Promise<{
  items: Array<{
    id: string;
    type: string;
    title: string;
    year: string;
    thumbnailUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
    photos: any[];
    uploadedBy: number;
    uploaderName: string;
    createdAt: string;
    isYou: boolean;
  }>;
  total: number;
}> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { items: [], total: 0 };
  }

  const { limit = 20, offset = 0, type, uploaderFilter = "all" } = options;

  const partnerId = await getPartnerUserId(coupleId, userId);

  // Build query
  let query = `
    SELECT mi.id, mi.type, mi.title, mi.year, mi.thumbnail, mi.video_url, 
           mi.audio_url, mi.photos, mi.user_id, mi.created_at,
           u.display_name as uploader_name
    FROM media_items mi
    JOIN users u ON u.id = mi.user_id
    WHERE mi.couple_id = $1
  `;

  const params: any[] = [coupleId];
  let paramIndex = 2;

  // Filter by media type
  if (type) {
    query += ` AND mi.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  // Filter by uploader
  if (uploaderFilter === "self") {
    query += ` AND mi.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  } else if (uploaderFilter === "partner" && partnerId) {
    query += ` AND mi.user_id = $${paramIndex}`;
    params.push(partnerId);
    paramIndex++;
  }

  // Get total count
  const countQuery = `SELECT COUNT(*)::int as total FROM (${query}) as subquery`;
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = countRows[0]?.total || 0;

  // Add ordering and pagination
  query += ` ORDER BY mi.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(query, params);

    const items = rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      year: row.year,
      thumbnailUrl: row.thumbnail,
      videoUrl: row.video_url,
      audioUrl: row.audio_url,
      photos: row.photos || [],
      uploadedBy: row.user_id,
      uploaderName: row.uploader_name,
      createdAt: row.created_at,
      isYou: row.user_id === userId,
    }));

    return { items, total };
  } catch (error) {
    console.error("Get shared media error:", error);
    return { items: [], total: 0 };
  }
}

/**
 * Mark media item with couple_id when uploaded by a linked user
 */
export async function markMediaAsShared(
  userId: number,
  mediaId: string
): Promise<{ ok: boolean }> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { ok: false };
  }

  try {
    const result = await pool.query(
      `UPDATE media_items
       SET couple_id = $1
       WHERE id = $2 AND user_id = $3`,
      [coupleId, mediaId, userId]
    );

    if (result.rowCount === 0) {
      return { ok: false };
    }

    // Get media details for broadcast
    const { rows } = await pool.query(
      `SELECT mi.type, mi.thumbnail, u.display_name as uploader_name
       FROM media_items mi
       JOIN users u ON u.id = mi.user_id
       WHERE mi.id = $1`,
      [mediaId]
    );

    if (rows.length > 0) {
      const media = rows[0];
      broadcastNewMedia(coupleId, userId, {
        mediaId,
        uploaderName: media.uploader_name,
        type: media.type === "video" ? "video" : "photo",
        thumbnailUrl: media.thumbnail || "",
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("Mark media as shared error:", error);
    return { ok: false };
  }
}

/**
 * Auto-mark all new uploads as shared for linked users
 * This should be called after successful media upload
 */
export async function autoMarkNewUploadAsShared(
  userId: number,
  mediaId: string
): Promise<void> {
  // Silently mark as shared if user is linked
  await markMediaAsShared(userId, mediaId);
}
