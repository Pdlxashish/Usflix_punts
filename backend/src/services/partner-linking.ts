/**
 * Partner linking service - manages partner relationships and couple_id.
 * Extends the existing invitation system with couple_id and partner_links.
 */
import pool from "../db/connection.js";
import { generateCoupleId } from "../utils/couple-id.js";
import { householdIdForOwner } from "./invitations.js";

/**
 * Search for users by display name or email (fuzzy matching).
 * Excludes already-linked users.
 * 
 * @param searchQuery - Username or email to search for
 * @param requestingUserId - ID of user performing the search
 * @param limit - Maximum results to return (default: 10)
 * @returns Array of matching users
 */
export async function searchPartners(
  searchQuery: string,
  requestingUserId: number,
  limit: number = 10
) {
  const query = `%${searchQuery.toLowerCase()}%`;

  // Find users matching the search query who are not already linked
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.display_name, u.email, u.profile_picture_url
     FROM users u
     WHERE (LOWER(u.display_name) LIKE $1 OR LOWER(u.email) LIKE $1)
       AND u.id != $2
       AND NOT EXISTS (
         SELECT 1 FROM partner_links pl
         WHERE (pl.user_a_id = $2 AND pl.user_b_id = u.id)
            OR (pl.user_a_id = u.id AND pl.user_b_id = $2)
       )
     ORDER BY 
       CASE 
         WHEN LOWER(u.display_name) = $3 THEN 1
         WHEN LOWER(u.email) = $3 THEN 2
         WHEN LOWER(u.display_name) LIKE $1 THEN 3
         ELSE 4
       END,
       u.display_name
     LIMIT $4`,
    [query, requestingUserId, searchQuery.toLowerCase(), limit]
  );

  return rows;
}

/**
 * Get current link status for a user.
 * 
 * @param userId - User ID to check
 * @returns Link status information
 */
export async function getLinkStatus(userId: number) {
  const { rows } = await pool.query(
    `SELECT 
       pl.couple_id,
       pl.created_at,
       CASE 
         WHEN pl.user_a_id = $1 THEN pl.user_b_id
         ELSE pl.user_a_id
       END AS partner_user_id
     FROM partner_links pl
     WHERE pl.user_a_id = $1 OR pl.user_b_id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    return {
      isLinked: false,
      coupleId: null,
      partner: null,
    };
  }

  const link = rows[0];
  const { rows: partnerInfo } = await pool.query(
    `SELECT u.id AS user_id, u.display_name, u.profile_picture_url, u.email
     FROM users u
     WHERE u.id = $1`,
    [link.partner_user_id]
  );

  return {
    isLinked: true,
    coupleId: link.couple_id,
    linkedAt: link.created_at,
    partner: partnerInfo[0] || null,
  };
}

/**
 * Create a partner link after invitation acceptance.
 * This extends the invitation acceptance flow.
 * 
 * @param invitingUserId - User who sent the invitation
 * @param partnerUserId - User who accepted the invitation
 * @returns Created link information
 */
export async function createPartnerLink(invitingUserId: number, partnerUserId: number) {
  // Validate no existing link
  const existing = await getLinkStatus(invitingUserId);
  if (existing.isLinked) {
    throw new Error("User already has an active partner link");
  }

  const partnerExisting = await getLinkStatus(partnerUserId);
  if (partnerExisting.isLinked) {
    throw new Error("Partner already has an active partner link");
  }

  // Ensure consistent ordering (user_a_id < user_b_id)
  const userAId = Math.min(invitingUserId, partnerUserId);
  const userBId = Math.max(invitingUserId, partnerUserId);

  // Generate unique couple_id
  const coupleId = await generateCoupleId();
  const linkId = `plink-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create partner_links record
    await client.query(
      `INSERT INTO partner_links (id, couple_id, user_a_id, user_b_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [linkId, coupleId, userAId, userBId]
    );

    const householdId = householdIdForOwner(invitingUserId);

    // Update both users' profiles with couple_id and household_id
    await client.query(
      `UPDATE profiles
       SET couple_id = $1, household_id = $2
       WHERE user_id = $3 AND role = 'self'`,
      [coupleId, householdId, invitingUserId]
    );

    await client.query(
      `UPDATE profiles
       SET couple_id = $1, household_id = $2
       WHERE user_id = $3 AND role = 'self'`,
      [coupleId, householdId, partnerUserId]
    );

    // Update partner profiles with couple_id if they exist
    await client.query(
      `UPDATE profiles
       SET couple_id = $1
       WHERE user_id = $2 AND role = 'partner' AND linked_user_id = $3`,
      [coupleId, invitingUserId, partnerUserId]
    );

    await client.query(
      `UPDATE profiles
       SET couple_id = $1
       WHERE user_id = $2 AND role = 'partner' AND linked_user_id = $3`,
      [coupleId, partnerUserId, invitingUserId]
    );

    await client.query("COMMIT");

    return {
      coupleId,
      linkId,
      userAId,
      userBId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Unlink partners and clean up shared context.
 * 
 * @param userId - User requesting the unlink
 * @returns Success status
 */
export async function unlinkPartners(userId: number) {
  const linkStatus = await getLinkStatus(userId);
  
  if (!linkStatus.isLinked) {
    throw new Error("No active partner link found");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete the partner_links record
    await client.query(
      `DELETE FROM partner_links
       WHERE couple_id = $1`,
      [linkStatus.coupleId]
    );

    // Remove couple_id from profiles (but keep historical data)
    await client.query(
      `UPDATE profiles
       SET couple_id = NULL
       WHERE couple_id = $1`,
      [linkStatus.coupleId]
    );

    // Delete partner profiles (keep self profiles)
    await client.query(
      `DELETE FROM profiles
       WHERE couple_id = $1 AND role = 'partner'`,
      [linkStatus.coupleId]
    );

    // Note: We keep shared_messages, couple_activities, and location_updates
    // for historical purposes. They can be archived or cleaned up separately.

    await client.query("COMMIT");

    return {
      ok: true,
      coupleId: linkStatus.coupleId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get couple_id for a user.
 * 
 * @param userId - User ID
 * @returns couple_id or null if not linked
 */
export async function getCoupleId(userId: number): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT couple_id
     FROM partner_links
     WHERE user_a_id = $1 OR user_b_id = $1`,
    [userId]
  );

  return rows[0]?.couple_id || null;
}

/**
 * Get partner's user_id from couple_id.
 * 
 * @param coupleId - Couple ID
 * @param requestingUserId - User requesting partner info
 * @returns Partner's user_id or null
 */
export async function getPartnerUserId(coupleId: string, requestingUserId: number): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT 
       CASE 
         WHEN user_a_id = $2 THEN user_b_id
         ELSE user_a_id
       END AS partner_id
     FROM partner_links
     WHERE couple_id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
    [coupleId, requestingUserId]
  );

  return rows[0]?.partner_id || null;
}
