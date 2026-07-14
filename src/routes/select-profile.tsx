/**
 * /select-profile — Netflix-style profile selection with device-based recommendations
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Heart, UserCircle, Settings, Star, LogOut, UserPlus } from "lucide-react";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { useBranding } from "@/context/branding";
import { useProfile, type Profile as UserProfile } from "@/context/profile";
import { getClientId } from "@/lib/activity";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import {
  PartnerInviteDialog,
  PendingInviteCard,
  usePartnerInvite,
} from "@/components/partner/PartnerInviteDialog";

export const Route = createFileRoute("/select-profile")({
  component: SelectProfilePage,
  head: () => ({
    meta: [{ title: "Who's Watching?" }],
  }),
});

const PROFILE_USAGE_KEY = "usflix_profile_usage_per_device";

interface ProfileUsage {
  [deviceId: string]: {
    [profileId: string]: { count: number; lastUsed: number };
  };
}

function getDeviceProfileUsage(): ProfileUsage {
  try {
    const stored = localStorage.getItem(PROFILE_USAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDeviceProfileUsage(usage: ProfileUsage): void {
  try {
    localStorage.setItem(PROFILE_USAGE_KEY, JSON.stringify(usage));
  } catch {}
}

function recordProfileUsage(profileId: string): void {
  const deviceId = getClientId();
  const usage = getDeviceProfileUsage();
  if (!usage[deviceId]) usage[deviceId] = {};
  if (!usage[deviceId][profileId]) usage[deviceId][profileId] = { count: 0, lastUsed: 0 };
  usage[deviceId][profileId].count += 1;
  usage[deviceId][profileId].lastUsed = Date.now();
  saveDeviceProfileUsage(usage);
}

function getMostUsedProfile(): string | null {
  const deviceId = getClientId();
  const usage = getDeviceProfileUsage();
  const deviceUsage = usage[deviceId];
  if (!deviceUsage) return null;

  let mostUsedId: string | null = null;
  let highestCount = 0;
  let latestTime = 0;

  for (const [profileId, data] of Object.entries(deviceUsage)) {
    if (data.count > highestCount || (data.count === highestCount && data.lastUsed > latestTime)) {
      mostUsedId = profileId;
      highestCount = data.count;
      latestTime = data.lastUsed;
    }
  }
  return mostUsedId;
}

function roleLabel(profile: UserProfile): string {
  if (profile.is_primary) return "You";
  if (profile.role === "partner") return "Partner";
  if (profile.role === "self") return "Partner";
  return profile.name;
}

function SelectProfilePage() {
  const { signOut, isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const { branding } = useBranding();
  const { profiles, profilesReady, setActiveProfile, refreshProfiles } = useProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { state: inviteState, refresh: refreshInvite } = usePartnerInvite();

  const recommendedProfileId = useMemo(() => getMostUsedProfile(), []);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.id === recommendedProfileId) return -1;
      if (b.id === recommendedProfileId) return 1;
      if (a.role === "self" && b.role !== "self") return -1;
      if (a.role !== "self" && b.role === "self") return 1;
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [profiles, recommendedProfileId]);

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

  const handleProfileSelect = (profile: UserProfile) => {
    recordProfileUsage(profile.id);
    setActiveProfile(profile);
    navigate({ to: "/" });
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut();
    navigate({ to: "/sign-in/$", params: { _splat: "" }, search: { redirect: undefined } });
  };

  const handleInviteSuccess = async () => {
    await refreshInvite();
    await refreshProfiles();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <button
        onClick={handleLogout}
        disabled={loading}
        className="fixed top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border/60 hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        title="Logout"
      >
        <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-medium">Logout</span>
      </button>

      <div className="relative w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <span className="font-display text-3xl tracking-tight text-primary">
              {branding.platformName}
            </span>
          </div>
          <h1 className="font-display text-4xl text-foreground mb-2">Who's Watching?</h1>
          {clerkUser?.primaryEmailAddress?.emailAddress && (
            <p className="text-sm text-muted-foreground/70 mb-2">
              Signed in as{" "}
              <span className="text-foreground font-medium">
                {clerkUser.primaryEmailAddress.emailAddress}
              </span>
            </p>
          )}
          {recommendedProfileId && (
            <p className="text-sm text-muted-foreground">
              <Star className="inline h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
              Your usual profile is highlighted
            </p>
          )}
        </div>


        <PartnerInviteDialog
          open={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
          onSuccess={handleInviteSuccess}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedProfiles.map((profile) => {
            const isRecommended = profile.id === recommendedProfileId;
            const badge = roleLabel(profile);
            return (
              <button
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                disabled={loading}
                className={`group flex flex-col items-center p-6 rounded-xl bg-card/50 border transition-all duration-200 disabled:opacity-50 ${
                  isRecommended
                    ? "border-yellow-500/50 hover:border-yellow-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]"
                    : "border-border/60 hover:border-primary hover:scale-105"
                }`}
              >
                <div className="relative mb-4 group-hover:ring-4 group-hover:ring-primary/50 rounded-full transition-all">
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
                  {isRecommended && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Star className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>
                <span
                  className={`font-medium text-lg transition-colors ${
                    isRecommended
                      ? "text-yellow-500 group-hover:text-yellow-400"
                      : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {profile.name}
                </span>
                <span className="text-xs text-muted-foreground mt-1">{badge}</span>
                {isRecommended && (
                  <span className="text-xs text-yellow-500/80 mt-1">Recommended for you</span>
                )}
              </button>
            );
          })}

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
              className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border/60 hover:border-rose-500/50 hover:scale-105 transition-all duration-200 disabled:opacity-50"
            >
              <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 group-hover:bg-rose-500/20 transition-colors">
                <UserPlus className="w-12 h-12 text-rose-500" />
              </div>
              <span className="font-medium text-sm text-muted-foreground group-hover:text-rose-500 transition-colors">
                Add Partner
              </span>
            </button>
          )}

          <button
            onClick={() => navigate({ to: "/profiles" })}
            disabled={loading}
            className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border/60 hover:border-primary hover:scale-105 transition-all duration-200 disabled:opacity-50"
          >
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <Settings className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="font-medium text-sm text-muted-foreground group-hover:text-primary transition-colors">
              Manage Profiles
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
