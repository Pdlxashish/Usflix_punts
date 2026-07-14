/**
 * Partner invitations API (canonical routes).
 *
 * POST   /api/invitations              — create invitation
 * GET    /api/invitations/mine         — list pending + partner status (auth)
 * GET    /api/invitations/:token       — public: validate token
 * POST   /api/invitations/:token/accept
 * POST   /api/invitations/:token/decline
 * POST   /api/invitations/:id/resend
 * DELETE /api/invitations/:id          — revoke
 */
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  acceptInvitation,
  createInvitation,
  declineInvitation,
  getInvitationByToken,
  getLinkedPartner,
  getPendingInvite,
  inviteUrlForToken,
  resendInvitation,
  revokeInvitation,
  INVITE_EXPIRY_DAYS,
} from "../services/invitations.js";

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { inviteeEmail, email } = req.body;
    const result = await createInvitation(userId, inviteeEmail ?? email);

    if (!result.ok) {
      res.status(result.status).json({
        ok: false,
        error: result.error,
        partner: "partner" in result ? result.partner : undefined,
      });
      return;
    }

    res.status(201).json({
      ok: true,
      id: result.id,
      token: result.token,
      inviteUrl: result.inviteUrl,
      expiresAt: result.expiresAt,
      invitedEmail: result.invitedEmail,
      expiresInDays: INVITE_EXPIRY_DAYS,
    });
  } catch (err) {
    console.error("Create invitation error:", err);
    res.status(500).json({ ok: false, error: "Failed to create invitation" });
  }
});

router.get("/mine", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const partner = await getLinkedPartner(userId);

    if (partner) {
      res.json({
        ok: true,
        hasPartner: true,
        partner: { email: partner.email, displayName: partner.display_name },
        invite: null,
      });
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
        token: pending.invite_code,
        inviteUrl: inviteUrlForToken(pending.invite_code),
        invitedEmail: pending.invited_email,
        status: pending.status,
        expiresAt: pending.expires_at,
        createdAt: pending.created_at,
      },
    });
  } catch (err) {
    console.error("Get invitations error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch invitations" });
  }
});

router.get("/:token", async (req: Request, res: Response) => {
  try {
    if (req.params.token === "mine") return;

    const inv = await getInvitationByToken(paramId(req.params.token));
    if (!inv) {
      res.status(404).json({ ok: false, error: "Invitation not found" });
      return;
    }

    if (inv.status !== "pending") {
      res.status(410).json({ ok: false, error: `Invitation is ${inv.status}`, status: inv.status });
      return;
    }

    res.json({
      ok: true,
      ownerName: inv.owner_name,
      ownerEmail: inv.owner_email,
      invitedEmail: inv.invited_email,
      expiresAt: inv.expires_at,
      status: inv.status,
    });
  } catch (err) {
    console.error("Get invitation error:", err);
    res.status(500).json({ ok: false, error: "Failed to validate invitation" });
  }
});

router.post("/:token/accept", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await acceptInvitation(paramId(req.params.token), req.auth!.userId);
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      message: "Invitation accepted! You are now connected.",
      profileId: result.profileId,
      partnerName: result.partnerName,
    });
  } catch (err) {
    console.error("Accept invitation error:", err);
    res.status(500).json({ ok: false, error: "Failed to accept invitation" });
  }
});

router.post("/:token/decline", async (req: Request, res: Response) => {
  try {
    const result = await declineInvitation(paramId(req.params.token));
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, message: "Invitation declined" });
  } catch (err) {
    console.error("Decline invitation error:", err);
    res.status(500).json({ ok: false, error: "Failed to decline invitation" });
  }
});

router.post("/:id/resend", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await resendInvitation(paramId(req.params.id), req.auth!.userId);
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      token: result.token,
      inviteUrl: result.inviteUrl,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    console.error("Resend invitation error:", err);
    res.status(500).json({ ok: false, error: "Failed to resend invitation" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const count = await revokeInvitation(paramId(req.params.id), req.auth!.userId);
    if (count === 0) {
      res.status(404).json({ ok: false, error: "Invitation not found or already closed" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Revoke invitation error:", err);
    res.status(500).json({ ok: false, error: "Failed to revoke invitation" });
  }
});

export default router;
