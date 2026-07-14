/**
 * Partner Invite Tab — shown inside Advanced Settings.
 * Lets the space owner generate a shareable invite link for their partner.
 */
import { useState, useEffect, useCallback } from "react";
import { Link2, Copy, RefreshCw, CheckCircle, Users, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { AdminSectionCard, AdminFormActions } from "@/components/admin/AdminSubNavLayout";

interface InviteStatus {
  hasPartner: boolean;
  partner?: { email: string; displayName: string };
  invite?: {
    id: string;
    code: string;
    inviteUrl: string;
    invitedEmail?: string;
    expiresAt: string;
    status: string;
  };
}

export function PartnerInviteTab() {
  const toast = useToast();
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ ok: boolean } & InviteStatus>("/invitations/mine");
      setStatus({
        hasPartner: data.hasPartner,
        partner: data.partner,
        invite: data.invite
          ? {
              id: data.invite.id,
              code: data.invite.token,
              inviteUrl: data.invite.inviteUrl,
              invitedEmail: data.invite.invitedEmail,
              expiresAt: data.invite.expiresAt,
              status: data.invite.status,
            }
          : undefined,
      });
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await api.post<{ ok: boolean; inviteUrl: string; expiresAt: string; error?: string }>(
        "/invitations",
        { inviteeEmail: partnerEmail.trim() || undefined }
      );
      if (data.ok) {
        toast.success("Invite link created!");
        await refresh();
      } else {
        toast.error(data.error ?? "Failed to create invite");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!status?.invite?.id) return;
    if (!confirm("Revoke this invite? The current link will stop working.")) return;
    setRevoking(true);
    try {
      await api.delete(`/invitations/${status.invite.id}`);
      toast.success("Invite revoked");
      await refresh();
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevoking(false);
    }
  };

  const handleResend = async () => {
    if (!status?.invite?.id) return;
    setCreating(true);
    try {
      await api.post(`/invitations/${status.invite.id}/resend`);
      toast.success("New invite link generated");
      await refresh();
    } catch {
      toast.error("Failed to regenerate invite");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  if (loading) {
    return (
      <AdminSectionCard title="Partner" description="Connect your partner to this shared space.">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </AdminSectionCard>
    );
  }

  // Already has a partner
  if (status?.hasPartner && status.partner) {
    return (
      <AdminSectionCard
        title="Partner Connected"
        description="Your partner is linked to this shared space."
      >
        <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <CheckCircle className="h-8 w-8 text-green-400 shrink-0" />
          <div>
            <p className="font-medium text-foreground">{status.partner.displayName || "Partner"}</p>
            <p className="text-sm text-muted-foreground">{status.partner.email}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Both accounts share the same memory space, profiles, photos, and videos.
        </p>
      </AdminSectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite creation */}
      <AdminSectionCard
        title="Invite Your Partner"
        description="Generate a private link. Your partner opens it, signs in, and both accounts are linked."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Partner's email (optional hint)</label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@email.com"
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Optional — shown on the invite page so your partner knows it's for them.
            </p>
          </div>

          <AdminFormActions>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {status?.invite ? "Regenerate Link" : "Create Invite Link"}
            </button>
          </AdminFormActions>
        </div>
      </AdminSectionCard>

      {/* Active invite */}
      {status?.invite && (
        <AdminSectionCard
          title="Active Invite Link"
          description="Share this link with your partner. It expires in 7 days."
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-input/50 border border-border/60 rounded-lg">
              <code className="flex-1 text-xs text-primary break-all">{status.invite.inviteUrl}</code>
              <button
                onClick={() => handleCopy(status.invite!.inviteUrl)}
                className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Copy link"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Expires {new Date(status.invite.expiresAt).toLocaleString()}</span>
              {status.invite.invitedEmail && (
                <span>For: {status.invite.invitedEmail}</span>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleResend}
                disabled={creating}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" /> New link
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" /> Revoke
              </button>
            </div>
          </div>
        </AdminSectionCard>
      )}

      {/* Info */}
      <AdminSectionCard title="How it works" description="">
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Generate an invite link above.</li>
          <li>Send it to your partner (WhatsApp, email, etc.).</li>
          <li>They open the link and sign in with their own account.</li>
          <li>Both accounts are linked — you share photos, videos, profiles, and all content.</li>
        </ol>
        <div className="mt-4 flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Data is fully isolated from other users. Only you and your partner can see this space.
          </p>
        </div>
      </AdminSectionCard>
    </div>
  );
}
