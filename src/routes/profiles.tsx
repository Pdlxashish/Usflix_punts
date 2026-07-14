/**
 * /profiles — Profile management page (accessible from settings)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, UserCircle, Loader2, X, Edit, UserPlus } from "lucide-react";
import { useAuth } from "@clerk/tanstack-react-start";
import { useBranding } from "@/context/branding";
import { useProfile, type Profile as UserProfile } from "@/context/profile";
import { api } from "@/lib/api";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import {
  PartnerInviteDialog,
  PendingInviteCard,
  usePartnerInvite,
} from "@/components/partner/PartnerInviteDialog";

function roleLabel(profile: UserProfile): string {
  if (profile.role === "partner") return "Partner";
  if (profile.role === "self" || profile.is_primary) return "You";
  return "Profile";
}

export const Route = createFileRoute("/profiles")({
  component: ProfilesManagementPage,
  head: () => ({
    meta: [{ title: "Manage Profiles" }],
  }),
});

function ProfilesManagementPage() {
  const { profiles, profilesReady, updateProfile: updateProfileCtx, refreshProfiles } = useProfile();
  const { isSignedIn, isLoaded } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileColor, setNewProfileColor] = useState("bg-blue-500");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { state: inviteState, refresh: refreshInvite } = usePartnerInvite();

  const hasPartner = profiles.some((p) => p.role === "partner");
  const hasPendingInvite = Boolean(inviteState?.invite && !inviteState.hasPartner);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      refreshProfiles().catch(() => {});
    }
  }, [isLoaded, isSignedIn, refreshProfiles]);

  if (!isLoaded || !isSignedIn) {
    return <AuthLoadingScreen message="Checking your session…" />;
  }

  if (!profilesReady) {
    return <AuthLoadingScreen message="Loading your profiles…" />;
  }


  const deleteProfile = async (profileId: string) => {
    try {
      const result = await api.delete<{ ok: boolean; error?: string }>(`/profiles/${profileId}`);
      if (result.ok) await refreshProfiles();
      return result;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  };

  const updateProfile = async (
    profileId: string,
    updates: { name?: string; color?: string }
  ) => {
    try {
      const result = await updateProfileCtx(
        profileId,
        updates.name ?? "",
        updates.color ?? "bg-blue-500",
        null,
        "circle",
        null
      );
      return result;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  };

  const profileColors = [
    { value: "bg-blue-500", label: "Blue" },
    { value: "bg-rose-500", label: "Rose" },
    { value: "bg-purple-500", label: "Purple" },
    { value: "bg-green-500", label: "Green" },
    { value: "bg-orange-500", label: "Orange" },
    { value: "bg-pink-500", label: "Pink" },
    { value: "bg-indigo-500", label: "Indigo" },
    { value: "bg-teal-500", label: "Teal" },
  ];

  const handleInviteSuccess = async () => {
    await refreshInvite();
    await refreshProfiles();
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile || !newProfileName.trim()) {
      setError("Profile name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updateProfile(editingProfile.id, {
      name: newProfileName.trim(),
      color: newProfileColor,
    });

    if (result.ok) {
      setEditingProfile(null);
      setNewProfileName("");
      setNewProfileColor("bg-blue-500");
    } else {
      setError(result.error || "Failed to update profile");
    }
    
    setLoading(false);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm("Are you sure you want to delete this profile? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await deleteProfile(profileId);

    if (!result.ok) {
      setError(result.error || "Failed to delete profile");
    }
    
    setLoading(false);
  };

  const startEdit = (profile: UserProfile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setNewProfileColor(profile.color);
  };

  if (editingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-6">
              <Heart className="h-8 w-8 text-primary fill-primary" />
              <span className="font-display text-3xl tracking-tight text-primary">
                {branding.platformName}
              </span>
            </div>
            <h1 className="font-display text-3xl text-foreground mb-2">Edit Profile</h1>
          </div>

          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="bg-card/50 border border-border/60 rounded-xl p-6 shadow-[var(--shadow-card)]">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Profile Name</label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g., My Profile"
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={50}
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Profile Color</label>
              <div className="grid grid-cols-4 gap-2">
                {profileColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewProfileColor(color.value)}
                    className={`h-12 rounded-lg ${color.value} transition-all ${
                      newProfileColor === color.value
                        ? "ring-4 ring-primary scale-105"
                        : "hover:scale-105"
                    }`}
                    title={color.label}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingProfile(null);
                  setNewProfileName("");
                  setNewProfileColor("bg-blue-500");
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={loading || !newProfileName.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <span className="font-display text-3xl tracking-tight text-primary">
              {branding.platformName}
            </span>
          </div>
          <h1 className="font-display text-4xl text-foreground mb-2">Manage Profiles</h1>
          <p className="text-muted-foreground">Your account and partner profile — edit names and avatars here</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-center">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          </div>
        )}

        <PartnerInviteDialog
          open={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
          onSuccess={handleInviteSuccess}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {profiles.map((profile) => (
            <div key={profile.id} className="relative group">
              <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/60">
                <div className="relative mb-4">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt={profile.name}
                      className={`w-24 h-24 object-cover ${
                        profile.avatar_shape === "circle" ? "rounded-full" : "rounded-lg"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-24 h-24 ${profile.color} flex items-center justify-center ${
                        profile.avatar_shape === "circle" ? "rounded-full" : "rounded-lg"
                      }`}
                    >
                      <UserCircle className="w-16 h-16 text-white" />
                    </div>
                  )}
                </div>
                <span className="font-medium text-lg text-foreground mb-1">{profile.name}</span>
                <span className="text-xs text-muted-foreground mb-3">{roleLabel(profile)}</span>
                
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => startEdit(profile)}
                    className="flex-1 px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  {profile.role === "partner" && (
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="px-3 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      disabled={loading}
                      title="Delete profile"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!hasPartner && hasPendingInvite && inviteState?.invite && (
            <PendingInviteCard
              inviteUrl={inviteState.invite.inviteUrl}
              expiresAt={inviteState.invite.expiresAt}
              invitedEmail={inviteState.invite.invitedEmail}
              onManage={() => setInviteDialogOpen(true)}
            />
          )}

          {!hasPartner && !hasPendingInvite && (
            <button
              onClick={() => setInviteDialogOpen(true)}
              disabled={loading}
              className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-rose-500/40 hover:border-rose-500 hover:scale-105 transition-all duration-200 disabled:opacity-50"
            >
              <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 group-hover:bg-rose-500/20 transition-colors">
                <UserPlus className="w-12 h-12 text-rose-500" />
              </div>
              <span className="font-medium text-sm text-muted-foreground group-hover:text-rose-500 transition-colors">
                Invite Partner
              </span>
            </button>
          )}

        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate({ to: "/select-profile" })}
            className="px-6 py-3 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Back to Profile Selection
          </button>
        </div>
      </div>
    </div>
  );
}
