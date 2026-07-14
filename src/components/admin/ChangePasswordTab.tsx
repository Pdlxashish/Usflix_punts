/**
 * Account security — change admin password while signed in.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuth, useClerk } from "@clerk/tanstack-react-start";
import { api } from "@/lib/api";
import { AdminSectionCard, AdminFormActions } from "@/components/admin/AdminSubNavLayout";
import { useToast } from "@/components/ui/Toast";

const MIN_PASSWORD_LENGTH = 6;

export function ChangePasswordTab() {
  const { signOut } = useClerk();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync browser autofill into React state (autofill often skips onChange)
  useEffect(() => {
    const sync = () => {
      const current = document.getElementById("current-password") as HTMLInputElement | null;
      const next = document.getElementById("new-password") as HTMLInputElement | null;
      const confirm = document.getElementById("confirm-password") as HTMLInputElement | null;
      if (current?.value) setCurrentPassword(current.value);
      if (next?.value) setNewPassword(next.value);
      if (confirm?.value) setConfirmPassword(confirm.value);
    };
    sync();
    const t = window.setTimeout(sync, 100);
    const t2 = window.setTimeout(sync, 500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

  const newPasswordValid = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    const result = await api.postSafe<{ ok: boolean; error?: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    setLoading(false);

    if (result.ok && result.data?.ok) {
      resetForm();
      await signOut();
      toast.success("Password updated. Sign in with your new credentials.");
      navigate({ to: "/sign-in/$", params: { _splat: "" } });
    }

    setError(result.error || "Could not update password. Please try again.");
  };

  return (
    <div className="max-w-2xl space-y-4">
      <AdminSectionCard
        title="Change password"
        description={
          userId
            ? "Update your account password. You will be signed out after saving."
            : "Update your admin account password. You will be signed out after saving."
        }
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <PasswordField
            id="current-password"
            label="Current password"
            value={currentPassword}
            onChange={(v) => {
              setCurrentPassword(v);
              setError(null);
            }}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((s) => !s)}
            autoComplete="current-password"
          />

          <PasswordField
            id="new-password"
            label="New password"
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setError(null);
            }}
            show={showNew}
            onToggleShow={() => setShowNew((s) => !s)}
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setError(null);
            }}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((s) => !s)}
            autoComplete="new-password"
          />

          {newPassword.length > 0 && !newPasswordValid && (
            <p className="text-xs text-muted-foreground">
              {MIN_PASSWORD_LENGTH - newPassword.length} more character
              {MIN_PASSWORD_LENGTH - newPassword.length === 1 ? "" : "s"} needed
            </p>
          )}
          {confirmPassword.length > 0 && newPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}

          <AdminFormActions>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-all shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Update password
                </>
              )}
            </button>
          </AdminFormActions>
        </form>
      </AdminSectionCard>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground/80">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={(e) => onChange(e.currentTarget.value)}
          autoComplete={autoComplete}
          className="w-full bg-input border border-border rounded-md px-4 py-3 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-sm"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
