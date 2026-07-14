/**
 * AcceptInvite
 * Accept invitation by entering invite code.
 */
import { useState } from "react";
import { Key, Loader2, Check, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useLinkStatus } from "@/context/link-status";

interface InviterPreview {
  displayName: string;
  email: string;
  profilePictureUrl: string | null;
  invitedEmail?: string;
}

interface AcceptInviteProps {
  onSuccess?: () => void;
}

export function AcceptInvite({ onSuccess }: AcceptInviteProps) {
  const toast = useToast();
  const { refreshLinkStatus } = useLinkStatus();
  const [inviteCode, setInviteCode] = useState("");
  const [inviterPreview, setInviterPreview] = useState<InviterPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidateCode = async () => {
    const code = inviteCode.trim();
    if (code.length < 10) {
      setError("Please enter a valid invitation code");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // In a real implementation, you would have an endpoint to validate/preview the invite
      // For now, we'll try to accept it and show preview if available
      const data = await api.post<{
        ok: boolean;
        inviter?: InviterPreview;
        error?: string;
      }>(`/invitations/preview/${code}`);

      if (data.ok && data.inviter) {
        setInviterPreview(data.inviter);
      } else {
        setError(data.error || "Invalid invitation code");
      }
    } catch (err) {
      console.error("Validate invite error:", err);
      setError(err instanceof Error ? err.message : "Invalid invitation code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleAccept = async () => {
    const code = inviteCode.trim();
    setIsAccepting(true);
    setError(null);

    try {
      const data = await api.post<{
        ok: boolean;
        error?: string;
      }>("/invitations/accept", {
        inviteToken: code,
      });

      if (data.ok) {
        toast.success("Invitation accepted! You are now linked with your partner.");
        await refreshLinkStatus();
        onSuccess?.();
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      console.error("Accept invite error:", err);
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    setInviterPreview(null);
    setInviteCode("");
    setError(null);
  };

  const handleCodeChange = (value: string) => {
    setInviteCode(value);
    setInviterPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {!inviterPreview ? (
        <>
          {/* Info Card */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-1">
              Enter Invitation Code
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter the invitation code your partner shared with you to link your accounts.
            </p>
          </div>

          {/* Code Input */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Invitation Code
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Enter invitation code..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              The code is usually a long string of characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-start gap-2">
              <X className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Validate Button */}
          <button
            type="button"
            onClick={handleValidateCode}
            disabled={isValidating || inviteCode.trim().length < 10}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Continue
              </>
            )}
          </button>

          {/* Instructions */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-foreground mb-2">How to get the code:</p>
            <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
              <li>Ask your partner to generate an invitation link</li>
              <li>They can share it via email, text, or any messenger</li>
              <li>Copy the code from the link and paste it here</li>
              <li>Click Continue to preview and accept the invitation</li>
            </ol>
          </div>
        </>
      ) : (
        <>
          {/* Inviter Preview */}
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-3">Invitation from:</p>
            <div className="flex items-center gap-3">
              {inviterPreview.profilePictureUrl ? (
                <img
                  src={inviterPreview.profilePictureUrl}
                  alt={inviterPreview.displayName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-lg">
                  {inviterPreview.displayName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {inviterPreview.email}
                </p>
                {inviterPreview.invitedEmail && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Invitation for: {inviterPreview.invitedEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              By accepting this invitation, you&apos;ll be able to share memories, activities,
              messages, and more with <strong>{inviterPreview.displayName}</strong>.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-start gap-2">
              <X className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-muted text-sm font-medium disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Accept Invitation
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
