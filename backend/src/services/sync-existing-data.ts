/**
 * Sync Existing Data Service
 * Updates existing media_items, collections, and canvas_drawings with couple_id
 * so that content from both partners becomes visible to each other.
 */
import pool from "../db/connection.js";

interface SyncResult {
  ok: boolean;
  mediaItemsUpdated: number;
  collectionsUpdated: number;
  canvasDrawingsUpdated: number;
  error?: string;
}

/**
 * Sync all existing data for a linked couple
 * This should be called when two users link as partners
 */
export async function syncExistingDataForCouple(
  coupleId: string,
  userAId: number,
  userBId: number
): Promise<SyncResult> {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    // Update media_items for both users
    const mediaResult = await client.query(
      `UPDATE media_items
       SET couple_id = $1
       WHERE (user_id = $2 OR user_id = $3)
       AND couple_id IS NULL`,
      [coupleId, userAId, userBId]
    );

    // Update collections for both users
    const collectionsResult = await client.query(
      `UPDATE collections
       SET couple_id = $1
       WHERE (user_id = $2 OR user_id = $3)
       AND couple_id IS NULL`,
      [coupleId, userAId, userBId]
    );

    // Update canvas_drawings for both users
    const canvasResult = await client.query(
      `UPDATE canvas_drawings
       SET couple_id = $1
       WHERE (user_id = $2 OR user_id = $3)
       AND couple_id IS NULL`,
      [coupleId, userAId, userBId]
    );

    await client.query("COMMIT");

    console.log(`[Sync] Updated existing data for couple ${coupleId}:`, {
      mediaItems: mediaResult.rowCount,
      collections: collectionsResult.rowCount,
      canvasDrawings: canvasResult.rowCount,
    });

    return {
      ok: true,
      mediaItemsUpdated: mediaResult.rowCount || 0,
      collectionsUpdated: collectionsResult.rowCount || 0,
      canvasDrawingsUpdated: canvasResult.rowCount || 0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Sync] Error syncing existing data:", error);
    return {
      ok: false,
      mediaItemsUpdated: 0,
      collectionsUpdated: 0,
      canvasDrawingsUpdated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    client.release();
  }
}

/**
 * Manually sync data for a specific couple_id
 * Useful for fixing existing linked partners
 */
export async function manualSyncForCouple(coupleId: string): Promise<SyncResult> {
  try {
    // Get the two users for this couple
    const linkResult = await pool.query(
      `SELECT user_a_id, user_b_id FROM partner_links WHERE couple_id = $1`,
      [coupleId]
    );

    if (linkResult.rows.length === 0) {
      return {
        ok: false,
        mediaItemsUpdated: 0,
        collectionsUpdated: 0,
        canvasDrawingsUpdated: 0,
        error: "Couple not found",
      };
    }

    const { user_a_id, user_b_id } = linkResult.rows[0];

    return await syncExistingDataForCouple(coupleId, user_a_id, user_b_id);
  } catch (error) {
    console.error("[Sync] Error in manual sync:", error);
    return {
      ok: false,
      mediaItemsUpdated: 0,
      collectionsUpdated: 0,
      canvasDrawingsUpdated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync all existing partner links
 * Use this to backfill data for couples that were linked before this feature
 */
export async function syncAllExistingCouples(): Promise<{
  ok: boolean;
  couplesProcessed: number;
  totalMediaItems: number;
  totalCollections: number;
  totalCanvasDrawings: number;
  errors: string[];
}> {
  try {
    // Get all partner links
    const linksResult = await pool.query(
      `SELECT couple_id, user_a_id, user_b_id FROM partner_links`
    );

    let totalMediaItems = 0;
    let totalCollections = 0;
    let totalCanvasDrawings = 0;
    const errors: string[] = [];

    for (const link of linksResult.rows) {
      const result = await syncExistingDataForCouple(
        link.couple_id,
        link.user_a_id,
        link.user_b_id
      );

      if (result.ok) {
        totalMediaItems += result.mediaItemsUpdated;
        totalCollections += result.collectionsUpdated;
        totalCanvasDrawings += result.canvasDrawingsUpdated;
      } else {
        errors.push(`Couple ${link.couple_id}: ${result.error}`);
      }
    }

    return {
      ok: true,
      couplesProcessed: linksResult.rows.length,
      totalMediaItems,
      totalCollections,
      totalCanvasDrawings,
      errors,
    };
  } catch (error) {
    console.error("[Sync] Error syncing all couples:", error);
    return {
      ok: false,
      couplesProcessed: 0,
      totalMediaItems: 0,
      totalCollections: 0,
      totalCanvasDrawings: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
