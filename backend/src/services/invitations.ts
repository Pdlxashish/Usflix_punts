/**
 * Partner invitation business logic (shared by /api/invitations and /api/partner-invite).
 */
import { randomBytes } from "crypto";
import pool from "../db/connection.js";

export const INVITE_EXPIRY_DAYS = parseInt(process.env.INVITE_EXPIRY_DAYS || "7", 10);

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function inviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
  return d;
}

export function frontendBaseUrl(): string {
  return process.env.FRONTEND_URL?.split(",")[0]?.trim() ?? "https://localhost:8080";
}

export function inviteUrlForToken(token: string): string {
  return `${frontendBaseUrl()}/invite/${token}`;
}

export function householdIdForOwner(ownerUserId: number): string {
  return `household-${ownerUserId}`;
}

export async function getLinkedPartner(userId: number) {
  const { rows } = await pool.query(
    `SELECT cu.email, cu.display_name, cu.user_id
     FROM tenant_memberships tm
     JOIN clerk_users cu ON cu.user_id = CASE
       WHEN tm.owner_user_id = $1 THEN tm.member_user_id
       ELSE tm.owner_user_id
     END
     WHERE (tm.owner_user_id = $1 OR tm.member_user_id = $1)
       AND tm.owner_user_id != tm.member_user_id
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function userHasPartnerProfile(userId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM profiles p
     JOIN user_profiles up ON up.profile_id = p.id
     WHERE up.user_id = $1 AND p.role = 'partner'
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

export async function getPendingInvite(invitingUserId: number) {
  await pool.query(
    `UPDATE partner_invites SET status = 'expired'
     WHERE inviting_user_id = $1 AND status = 'pending' AND expires_at <= NOW()`,
    [invitingUserId]
  );

  const { rows } = await pool.query(
    `SELECT id, invite_code, invited_email, status, expires_at, created_at
     FROM partner_invites
     WHERE inviting_user_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [invitingUserId]
  );
  return rows[0] ?? null;
}

export async function createInvitation(invitingUserId: number, inviteeEmail?: string | null) {
  const partner = await getLinkedPartner(invitingUserId);
  if (partner) {
    return {
      ok: false as const,
      status: 409,
      error: "You already have a partner linked to this space.",
      partner: { email: partner.email, displayName: partner.display_name },
    };
  }

  const hasPartnerProfile = await userHasPartnerProfile(invitingUserId);
  if (hasPartnerProfile) {
    return {
      ok: false as const,
      status: 409,
      error: "A partner profile already exists for this account.",
    };
  }

  await pool.query(
    `UPDATE partner_invites SET status = 'revoked'
     WHERE inviting_user_id = $1 AND status = 'pending'`,
    [invitingUserId]
  );

  const token = generateInviteToken();
  const expires = inviteExpiresAt();
  const inviteId = `inv-${Date.now()}`;
  const email = inviteeEmail?.trim().toLowerCase() || null;

  await pool.query(
    `INSERT INTO partner_invites
       (id, inviting_user_id, invite_code, invited_email, status, expires_at)
     VALUES ($1, $2, $3, $4, 'pending', $5)`,
    [inviteId, invitingUserId, token, email, expires]
  );

  return {
    ok: true as const,
    id: inviteId,
    token,
    inviteUrl: inviteUrlForToken(token),
    expiresAt: expires,
    invitedEmail: email,
  };
}

export async function getInvitationByToken(token: string) {
  const { rows } = await pool.query(
    `SELECT pi.*, cu.email AS owner_email, cu.display_name AS owner_name
     FROM partner_invites pi
     JOIN clerk_users cu ON cu.user_id = pi.inviting_user_id
     WHERE pi.invite_code = $1`,
    [token]
  );
  if (rows.length === 0) return null;

  const inv = rows[0];
  if (inv.status === "pending" && new Date(inv.expires_at) < new Date()) {
    await pool.query(`UPDATE partner_invites SET status = 'expired' WHERE id = $1`, [inv.id]);
    inv.status = "expired";
  }
  return inv;
}

export async function acceptInvitation(token: string, partnerUserId: number) {
  const inv = await getInvitationByToken(token);
  if (!inv) {
    return { ok: false as const, status: 404, error: "Invitation not found" };
  }
  if (inv.status !== "pending") {
    return { ok: false as const, status: 410, error: `Invitation is ${inv.status}` };
  }
  if (new Date(inv.expires_at) < new Date()) {
    return { ok: false as const, status: 410, error: "Invitation has expired" };
  }

  const ownerUserId: number = inv.inviting_user_id;
  if (ownerUserId === partnerUserId) {
    return { ok: false as const, status: 400, error: "You cannot accept your own invitation" };
  }

  const { rows: existing } = await pool.query(
    "SELECT 1 FROM tenant_memberships WHERE owner_user_id = $1 AND member_user_id = $2",
    [ownerUserId, partnerUserId]
  );
  if (existing.length > 0) {
    return { ok: false as const, status: 409, error: "You are already partnered with this person" };
  }

  const { rows: partnerInfo } = await pool.query(
    "SELECT display_name, email FROM clerk_users WHERE user_id = $1 LIMIT 1",
    [partnerUserId]
  );
  const partnerName =
    partnerInfo[0]?.display_name?.split(" ")[0] ?? partnerInfo[0]?.email?.split("@")[0] ?? "Partner";

  const householdId = householdIdForOwner(ownerUserId);
  const profileId = `p-${ownerUserId}-partner`;

  // Import couple_id generation (lazy import to avoid circular dependency)
  const { generateCoupleId } = await import("../utils/couple-id.js");
  const coupleId = await generateCoupleId();

  // Ensure consistent ordering for partner_links (user_a_id < user_b_id)
  const userAId = Math.min(ownerUserId, partnerUserId);
  const userBId = Math.max(ownerUserId, partnerUserId);
  const linkId = `plink-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE partner_invites
       SET status = 'accepted', partner_user_id = $1, accepted_at = NOW()
       WHERE id = $2`,
      [partnerUserId, inv.id]
    );

    await client.query(
      `INSERT INTO tenant_memberships (owner_user_id, member_user_id, role)
       VALUES ($1, $2, 'partner')
       ON CONFLICT DO NOTHING`,
      [ownerUserId, partnerUserId]
    );

    // Create partner_links record with couple_id
    await client.query(
      `INSERT INTO partner_links (id, couple_id, user_a_id, user_b_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [linkId, coupleId, userAId, userBId]
    );

    await client.query(
      `INSERT INTO profiles (id, user_id, name, color, avatar_shape, role, household_id, linked_user_id, couple_id)
       VALUES ($1, $2, $3, 'bg-rose-500', 'circle', 'partner', $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         role = 'partner',
         household_id = EXCLUDED.household_id,
         linked_user_id = EXCLUDED.linked_user_id,
         couple_id = EXCLUDED.couple_id`,
      [profileId, ownerUserId, partnerName, householdId, partnerUserId, coupleId]
    );

    await client.query(
      `UPDATE profiles SET household_id = $2, couple_id = $3 WHERE user_id = $1 AND role = 'self'`,
      [ownerUserId, householdId, coupleId]
    );

    await client.query(
      `UPDATE profiles SET couple_id = $2 WHERE user_id = $1 AND role = 'self'`,
      [partnerUserId, coupleId]
    );

    await client.query(
      `INSERT INTO user_profiles (user_id, profile_id, is_primary)
       VALUES ($1, $2, false), ($3, $2, false)
       ON CONFLICT (user_id, profile_id) DO NOTHING`,
      [ownerUserId, profileId, partnerUserId]
    );

    // Cross-link self profiles so both users see each other on the profile picker
    const { rows: ownerSelf } = await client.query(
      `SELECT p.id FROM profiles p
       JOIN user_profiles up ON up.profile_id = p.id
       WHERE up.user_id = $1 AND p.role = 'self'
       ORDER BY up.is_primary DESC
       LIMIT 1`,
      [ownerUserId]
    );
    if (ownerSelf[0]) {
      await client.query(
        `INSERT INTO user_profiles (user_id, profile_id, is_primary)
         VALUES ($1, $2, false)
         ON CONFLICT (user_id, profile_id) DO NOTHING`,
        [partnerUserId, ownerSelf[0].id]
      );
    }

    const { rows: partnerSelf } = await client.query(
      `SELECT p.id FROM profiles p
       JOIN user_profiles up ON up.profile_id = p.id
       WHERE up.user_id = $1 AND p.role = 'self'
       ORDER BY up.is_primary DESC
       LIMIT 1`,
      [partnerUserId]
    );
    if (partnerSelf[0]) {
      await client.query(
        `INSERT INTO user_profiles (user_id, profile_id, is_primary)
         VALUES ($1, $2, false)
         ON CONFLICT (user_id, profile_id) DO NOTHING`,
        [ownerUserId, partnerSelf[0].id]
      );
    }

    await client.query("COMMIT");

    // Sync existing data (media_items, collections, canvas_drawings) for both users
    // This runs after commit to avoid blocking the transaction
    const { syncExistingDataForCouple } = await import("./sync-existing-data.js");
    syncExistingDataForCouple(coupleId, userAId, userBId).then((result) => {
      if (result.ok) {
        console.log(`[Invitation] Synced existing data for couple ${coupleId}:`, {
          mediaItems: result.mediaItemsUpdated,
          collections: result.collectionsUpdated,
          canvasDrawings: result.canvasDrawingsUpdated,
        });
      } else {
        console.error(`[Invitation] Failed to sync data for couple ${coupleId}:`, result.error);
      }
    }).catch((err) => {
      console.error(`[Invitation] Error in sync process:`, err);
    });

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { ok: true as const, profileId, partnerName };
}

export async function declineInvitation(token: string) {
  const inv = await getInvitationByToken(token);
  if (!inv) return { ok: false as const, status: 404, error: "Invitation not found" };
  if (inv.status !== "pending") {
    return { ok: false as const, status: 410, error: `Invitation is ${inv.status}` };
  }
  await pool.query(`UPDATE partner_invites SET status = 'declined' WHERE id = $1`, [inv.id]);
  return { ok: true as const };
}

export async function revokeInvitation(inviteId: string, invitingUserId: number) {
  const { rowCount } = await pool.query(
    `UPDATE partner_invites SET status = 'revoked'
     WHERE id = $1 AND inviting_user_id = $2 AND status = 'pending'`,
    [inviteId, invitingUserId]
  );
  return rowCount ?? 0;
}

export async function resendInvitation(inviteId: string, invitingUserId: number) {
  const { rows } = await pool.query(
    `SELECT id FROM partner_invites
     WHERE id = $1 AND inviting_user_id = $2 AND status IN ('pending', 'expired')`,
    [inviteId, invitingUserId]
  );
  if (rows.length === 0) {
    return { ok: false as const, status: 404, error: "Invitation not found" };
  }

  const token = generateInviteToken();
  const expires = inviteExpiresAt();

  await pool.query(
    `UPDATE partner_invites
     SET invite_code = $3, status = 'pending', expires_at = $4, created_at = NOW()
     WHERE id = $1 AND inviting_user_id = $2`,
    [inviteId, invitingUserId, token, expires]
  );

  return {
    ok: true as const,
    token,
    inviteUrl: inviteUrlForToken(token),
    expiresAt: expires,
  };
}

export async function userCanEditProfile(userId: number, profileId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT p.user_id, p.role, p.linked_user_id
     FROM profiles p
     WHERE p.id = $1`,
    [profileId]
  );
  if (rows.length === 0) return false;

  const profile = rows[0];

  const { rows: direct } = await pool.query(
    "SELECT 1 FROM user_profiles WHERE user_id = $1 AND profile_id = $2",
    [userId, profileId]
  );
  if (direct.length > 0) return true;

  if (profile.linked_user_id === userId) return true;

  const partner = await getLinkedPartner(userId);
  if (partner && profile.user_id === partner.user_id) return true;

  const { rows: membership } = await pool.query(
    `SELECT 1 FROM tenant_memberships
     WHERE (owner_user_id = $1 AND member_user_id = $2)
        OR (owner_user_id = $2 AND member_user_id = $1)`,
    [userId, profile.user_id]
  );
  return membership.length > 0;
}
