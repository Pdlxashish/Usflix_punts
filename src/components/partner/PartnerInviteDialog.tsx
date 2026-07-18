import { useState, useEffect, useCallback } from "react";
import { Copy, CheckCircle, Loader2, Link2, Trash2, RefreshCw, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export interface PartnerInviteState {
  hasPartner: boolean;
  partner?: { email: string; displayName: string };
  invite?: {
    id: string;
    token: string;
    inviteUrl: string;
    invitedEmail?: string;
    status: string;
    expiresAt: string;
    createdAt?: string;
  } | null;
}

export function usePartnerInvite() {
  const [state, setState] = useState<PartnerInviteState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ ok: boolean } & PartnerInviteState>("/invitations/mine");
      setState({
        hasPartner: data.hasPartner,
        partner: data.partner,
        invite: data.invite,
      });
    } catch {
      setState({ hasPartner: false, invite: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const interval = window.setInterval(refresh, 12_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { state, loading, refresh };
}

interface PartnerInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PartnerInviteDialog({ open, onClose, onSuccess }: PartnerInviteDialogProps) {
  const toast = useToast();
  const { state, loading, refresh } = usePartnerInvite();
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await api.post<{
        ok: boolean;
        inviteUrl?: string;
        error?: string;
      }>("/invitations", { inviteeEmail: email.trim() || undefined });
      if (data.ok) {
        toast.success("Invitation link created!");
        await refresh();
        onSuccess?.();
      } else {
        toast.error(data.error ?? "Failed to create invitation");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!state?.invite?.id) return;
    setRevoking(true);
    try {
      await api.delete(`/invitations/${state.invite.id}`);
      toast.success("Invitation revoked");
      await refresh();
      onSuccess?.();
    } catch {
      toast.error("Failed to revoke invitation");
    } finally {
      setRevoking(false);
    }
  };

  const handleResend = async () => {
    if (!state?.invite?.id) return;
    setCreating(true);
    try {
      await api.post(`/invitations/${state.invite.id}/resend`);
      toast.success("New invitation link generated");
      await refresh();
      onSuccess?.();
    } catch {
      toast.error("Failed to resend invitation");
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
      toast.error("Could not copy link");
    }
  };

  const handleEmailShare = (url: string) => {
    const subject = encodeURIComponent("Join me on USFLIX");
    const body = encodeURIComponent(
      `I'd love to share our memory space with you on USFLIX.\n\nOpen this link to accept:\n${url}\n\nThe link expires in 7 days.`
    );
    window.open(`mailto:${email || ""}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
        <h2 className="font-display text-xl mb-1">Invite Your Partner</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Send a private link. They sign in with Clerk, accept, and a partner profile is created
          automatically.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : state?.hasPartner ? (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
            <p className="font-medium text-foreground">
              {state.partner?.displayName ?? "Partner"} is connected
            </p>
            <p className="text-sm text-muted-foreground">{state.partner?.email}</p>
          </div>
        ) : state?.invite ? (
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-2 text-amber-500 text-sm font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Invitation pending
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
              <code className="flex-1 text-xs text-primary break-all">{state.invite.inviteUrl}</code>
              <button
                type="button"
                onClick={() => handleCopy(state.invite!.inviteUrl)}
                className="shrink-0 p-1.5 rounded-md hover:bg-muted"
                title="Copy link"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {new Date(state.invite.expiresAt).toLocaleString()}
              {state.invite.invitedEmail && ` · Sent to ${state.invite.invitedEmail}`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={creating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Resend
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Partner&apos;s email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@email.com"
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Shown on the invite page so they know it&apos;s for them.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Generate Invite Link
            </button>
          </div>
        )}

        {state?.invite && !state.hasPartner && (
          <button
            type="button"
            onClick={() => handleEmailShare(state.invite!.inviteUrl)}
            className="w-full mb-3 inline-flex items-center justify-center gap-2 py-2 rounded-md border border-border text-sm hover:bg-muted"
          >
            <Mail className="h-4 w-4" /> Share via Email
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-md border border-border text-sm hover:bg-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function PendingInviteCard({
  inviteUrl,
  expiresAt,
  invitedEmail,
  onManage,
}: {
  inviteUrl: string;
  expiresAt: string;
  invitedEmail?: string;
  onManage?: () => void;
}) {
  return (
    <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-dashed border-amber-500/40">
      <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
      <span className="font-medium text-lg text-amber-500">Partner Pending</span>
      <span className="text-xs text-muted-foreground mt-1 text-center">
        {invitedEmail ? `Waiting for ${invitedEmail}` : "Waiting for acceptance"}
      </span>
      <span className="text-xs text-muted-foreground mt-1">
        Expires {new Date(expiresAt).toLocaleDateString()}
      </span>
      {onManage && (
        <button
          type="button"
          onClick={onManage}
          className="mt-3 text-xs text-primary hover:underline"
        >
          Manage invitation
        </button>
      )}
    </div>
  );
}
