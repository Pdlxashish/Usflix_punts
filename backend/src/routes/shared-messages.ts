/**
 * Shared Messages API Routes
 * Chat messaging between partners with real-time sync.
 */
import { Router, Request, Response } from "express";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getRequestUserId } from "../utils/tenant.js";
import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  getUnreadCount,
} from "../services/shared-messages.js";

const router = Router();

/**
 * GET /api/shared/messages
 * Get messages for the linked couple
 */
router.get("/messages", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    if (limit > 100) {
      res.status(400).json({ ok: false, error: "Maximum limit is 100" });
      return;
    }

    const messages = await getMessages(userId, limit, before);

    res.json({
      ok: true,
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/shared/messages
 * Send a message to partner
 */
router.post("/messages", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ ok: false, error: "Message text is required" });
      return;
    }

    if (text.length > 10000) {
      res.status(400).json({ ok: false, error: "Message is too long (max 10000 characters)" });
      return;
    }

    const result = await sendMessage(userId, text);

    if (result.ok) {
      res.status(201).json({
        ok: true,
        messageId: result.messageId,
      });
    } else {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ ok: false, error: "Failed to send message" });
  }
});

/**
 * PUT /api/shared/messages/read
 * Mark messages as read
 */
router.put("/messages/read", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds)) {
      res.status(400).json({ ok: false, error: "messageIds must be an array" });
      return;
    }

    const result = await markMessagesAsRead(userId, messageIds);

    res.json(result);
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res.status(500).json({ ok: false, error: "Failed to mark messages as read" });
  }
});

/**
 * DELETE /api/shared/messages/:messageId
 * Delete a message
 */
router.delete("/messages/:messageId", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const messageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;

    if (!messageId) {
      res.status(400).json({ ok: false, error: "Message ID is required" });
      return;
    }

    const result = await deleteMessage(userId, messageId);

    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(404).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ ok: false, error: "Failed to delete message" });
  }
});

/**
 * GET /api/shared/messages/unread-count
 * Get unread message count
 */
router.get("/messages/unread-count", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req)!;
    const count = await getUnreadCount(userId);

    res.json({
      ok: true,
      count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ ok: false, error: "Failed to get unread count" });
  }
});

export default router;
