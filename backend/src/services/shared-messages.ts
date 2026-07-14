/**
 * Shared Messages Service
 * Handles chat messages between partners with real-time sync.
 */
import pool from "../db/connection.js";
import { getCoupleId, getPartnerUserId } from "./partner-linking.js";
import { broadcastNewMessage } from "../websocket/broadcast.js";

/**
 * Send a message to partner
 */
export async function sendMessage(
  senderId: number,
  messageText: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!messageText || !messageText.trim()) {
    return { ok: false, error: "Message text is required" };
  }

  const coupleId = await getCoupleId(senderId);
  if (!coupleId) {
    return { ok: false, error: "You must be linked with a partner to send messages" };
  }

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    await pool.query(
      `INSERT INTO shared_messages (id, couple_id, sender_user_id, message_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [messageId, coupleId, senderId, messageText.trim()]
    );

    // Get sender name for broadcast
    const { rows: senderInfo } = await pool.query(
      `SELECT display_name FROM users WHERE id = $1`,
      [senderId]
    );
    const senderName = senderInfo[0]?.display_name || "Partner";

    // Broadcast to partner via WebSocket
    broadcastNewMessage(coupleId, senderId, {
      messageId,
      senderName,
      text: messageText.trim(),
      createdAt: new Date().toISOString(),
    });

    return { ok: true, messageId };
  } catch (error) {
    console.error("Send message error:", error);
    return { ok: false, error: "Failed to send message" };
  }
}

/**
 * Get messages for a couple (paginated)
 */
export async function getMessages(
  userId: number,
  limit: number = 50,
  beforeTimestamp?: string
): Promise<Array<{
  id: string;
  senderId: number;
  senderName: string;
  text: string;
  createdAt: string;
  isYou: boolean;
  readByPartner: boolean;
}>> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return [];
  }

  let query = `
    SELECT sm.id, sm.sender_user_id, sm.message_text, sm.created_at, sm.read_by_partner,
           u.display_name as sender_name
    FROM shared_messages sm
    JOIN users u ON u.id = sm.sender_user_id
    WHERE sm.couple_id = $1
  `;

  const params: any[] = [coupleId];

  if (beforeTimestamp) {
    query += ` AND sm.created_at < $2`;
    params.push(beforeTimestamp);
  }

  query += ` ORDER BY sm.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  try {
    const { rows } = await pool.query(query, params);

    return rows.map((row) => ({
      id: row.id,
      senderId: row.sender_user_id,
      senderName: row.sender_name,
      text: row.message_text,
      createdAt: row.created_at,
      isYou: row.sender_user_id === userId,
      readByPartner: row.read_by_partner,
    })).reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error("Get messages error:", error);
    return [];
  }
}

/**
 * Mark messages as read by partner
 */
export async function markMessagesAsRead(
  userId: number,
  messageIds: string[]
): Promise<{ ok: boolean }> {
  if (messageIds.length === 0) {
    return { ok: true };
  }

  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { ok: false };
  }

  try {
    // Mark messages as read where the user is NOT the sender
    await pool.query(
      `UPDATE shared_messages
       SET read_by_partner = TRUE
       WHERE couple_id = $1
         AND id = ANY($2)
         AND sender_user_id != $3`,
      [coupleId, messageIds, userId]
    );

    return { ok: true };
  } catch (error) {
    console.error("Mark messages as read error:", error);
    return { ok: false };
  }
}

/**
 * Delete a message (only sender can delete)
 */
export async function deleteMessage(
  userId: number,
  messageId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `DELETE FROM shared_messages
       WHERE id = $1 AND sender_user_id = $2`,
      [messageId, userId]
    );

    if (result.rowCount === 0) {
      return { ok: false, error: "Message not found or you don't have permission to delete it" };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete message error:", error);
    return { ok: false, error: "Failed to delete message" };
  }
}

/**
 * Get unread message count for user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return 0;
  }

  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM shared_messages
       WHERE couple_id = $1
         AND sender_user_id != $2
         AND read_by_partner = FALSE`,
      [coupleId, userId]
    );

    return rows[0]?.count || 0;
  } catch (error) {
    console.error("Get unread count error:", error);
    return 0;
  }
}
