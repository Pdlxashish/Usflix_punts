/**
 * InviteCodeGenerator
 * Generate and display invite code with copy and share functionality.
 */
import { useState, useEffect } from "react";
import { Copy, CheckCircle, Loader2, Link2, Trash2, RefreshCw, Mail, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useLinkStatus } from "@/context/link-status";

interface InviteData {
  id: string;
  token: string;
  inviteUrl: string;
  invitedEmail?: string;
  status: string;
  expiresAt: string;
  createdAt?: string;
}

interface InviteCodeGeneratorProps {
  onSuccess?: () => void;
}

export function InviteCodeGenerator({ onSuccess }: InviteCodeGeneratorProps) {
  const toast = useToast();
  const { refreshLinkStatus } = useLinkStatus();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchExistingInvite();
  }, []);

  const fetchExistingInvite = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{
        ok: boolean;
        invite?: InviteData;
      }>("/invitations/mine");

      if (data.ok && data.invite) {
        setInvite(data.invite);
      }
    } catch (error) {
      console.error("Error fetching invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsCreating(true);
    try {
      const data = await api.post<{
        ok: boolean;
        inviteUrl?: string;
        error?: string;
      }>("/invitations", {
        inviteeEmail: email.trim() || undefined,
      });

      if (data.ok) {
        toast.success("Invitation created successfully!");
        await fetchExistingInvite();
        await refreshLinkStatus();
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to create invitation");
      }
    } catch (error) {
      console.error("Create invite error:", error);
      toast.error(error instanceof Error ? error.message : "Network error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!invite?.id) return;
    setIsRevoking(true);
    try {
      await api.delete(`/invitations/${invite.id}`);
      toast.success("Invitation revoked");
      setInvite(null);
      await refreshLinkStatus();
      onSuccess?.();
    } catch (error) {
      console.error("Revoke invite error:", error);
      toast.error("Failed to revoke invitation");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleResend = async () => {
    if (!invite?.id) return;
    setIsCreating(true);
    try {
      await api.post(`/invitations/${invite.id}/resend`);
      toast.success("New invitation link generated");
      await fetchExistingInvite();
      await refreshLinkStatus();
      onSuccess?.();
    } catch (error) {
      console.error("Resend invite error:", error);
      toast.error("Failed to resend invitation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!invite?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleEmailShare = () => {
    if (!invite?.inviteUrl) return;
    const subject = encodeURIComponent("Join me on USFLIX");
    const body = encodeURIComponent(
      `I'd love to share our memory space with you on USFLIX.\n\nOpen this link to accept:\n${invite.inviteUrl}\n\nThe link expires in 7 days.`
    );
    window.open(
      `mailto:${invite.invitedEmail || ""}?subject=${subject}&body=${body}`,
      "_blank"
    );
  };

  const getTimeRemaining = () => {
    if (!invite?.expiresAt) return null;
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invite) {
    return (
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2 text-amber-500 text-sm font-medium p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Invitation pending</span>
          <div className="flex-1" />
          <Clock className="h-4 w-4" />
          <span className="text-xs">{getTimeRemaining()}</span>
        </div>

        {/* Invite Link Display */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Invitation Link
          </label>
          <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
            <code className="flex-1 text-xs text-primary break-all font-mono">
              {invite.inviteUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors"
              title="Copy link"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-foreground" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link with your partner to accept the invitation
            {invite.invitedEmail && ` · Sent to ${invite.invitedEmail}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEmailShare}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-muted text-sm"
          >
            <Mail className="h-4 w-4" />
            Share via Email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={isCreating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-muted text-sm disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </button>
        </div>

        <button
          type="button"
          onClick={handleRevoke}
          disabled={isRevoking}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm disabled:opacity-50"
        >
          {isRevoking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Revoking...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Revoke Invitation
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-1">
          Generate Your Invitation Link
        </h3>
        <p className="text-xs text-muted-foreground">
          Create a unique invitation link that your partner can use to link their account with yours.
          The link expires after 7 days.
        </p>
      </div>

      {/* Email Input (Optional) */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Partner&apos;s Email (Optional)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@email.com"
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Optional: The email will be shown on the invite page so they know it&apos;s for them
        </p>
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isCreating}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Link2 className="h-5 w-5" />
            Generate Invitation Link
          </>
        )}
      </button>

      {/* Instructions */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs font-medium text-foreground mb-2">How it works:</p>
        <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Click "Generate Invitation Link" to create a unique link</li>
          <li>Share the link with your partner via email, text, or any messenger</li>
          <li>Your partner opens the link and accepts the invitation</li>
          <li>Both accounts are linked and you can start sharing memories!</li>
        </ol>
      </div>
    </div>
  );
}
