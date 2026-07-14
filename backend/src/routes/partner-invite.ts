/**
 * Legacy partner-invite routes — delegates to invitations service.
 * Prefer /api/invitations for new clients.
 */
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  acceptInvitation,
  createInvitation,
  getInvitationByToken,
  getLinkedPartner,
  getPendingInvite,
  inviteUrlForToken,
  INVITE_EXPIRY_DAYS,
} from "../services/invitations.js";
import pool from "../db/connection.js";

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.post("/create", requireAuth, async (req: Request, res: Response) => {
  const result = await createInvitation(req.auth!.userId, req.body.email);
  if (!result.ok) {
    res.status(result.status).json({
      ok: false,
      error: result.error,
      partner: "partner" in result ? result.partner : undefined,
    });
    return;
  }
  res.json({
    ok: true,
    inviteUrl: result.inviteUrl,
    code: result.token,
    expiresAt: result.expiresAt,
  });
});

router.get("/status", requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const partner = await getLinkedPartner(userId);
  if (partner) {
    res.json({ ok: true, hasPartner: true, partner: { email: partner.email, displayName: partner.display_name } });
    return;
  }
  const pending = await getPendingInvite(userId);
  if (!pending) {
    res.json({ ok: true, hasPartner: false, invite: null });
    return;
  }
  res.json({
    ok: true,
    hasPartner: false,
    invite: {
      id: pending.id,
      code: pending.invite_code,
      inviteUrl: inviteUrlForToken(pending.invite_code),
      invitedEmail: pending.invited_email,
      status: pending.status,
      expiresAt: pending.expires_at,
      createdAt: pending.created_at,
    },
  });
});

router.get("/info/:code", async (req: Request, res: Response) => {
  const inv = await getInvitationByToken(paramId(req.params.code));
  if (!inv) {
    res.status(404).json({ ok: false, error: "Invite not found" });
    return;
  }
  if (inv.status !== "pending") {
    res.status(410).json({ ok: false, error: `Invite is ${inv.status}` });
    return;
  }
  res.json({
    ok: true,
    ownerName: inv.owner_name,
    ownerEmail: inv.owner_email,
    invitedEmail: inv.invited_email,
    expiresAt: inv.expires_at,
  });
});

router.post("/accept", requireAuth, async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ ok: false, error: "code is required" });
    return;
  }
  const result = await acceptInvitation(code, req.auth!.userId);
  if (!result.ok) {
    res.status(result.status).json({ ok: false, error: result.error });
    return;
  }
  res.json({ ok: true, message: "Invite accepted! You are now connected." });
});

router.delete("/revoke", requireAuth, async (req: Request, res: Response) => {
  await pool.query(
    `UPDATE partner_invites SET status = 'revoked'
     WHERE inviting_user_id = $1 AND status = 'pending'`,
    [req.auth!.userId]
  );
  res.json({ ok: true });
});

export default router;
