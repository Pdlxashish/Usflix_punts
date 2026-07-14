/**
 * Profile context — uses backend API for My List and Comments.
 * Active profile is chosen on /select-profile; not auto-restored on fresh login.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@/lib/api";
import { getClientId, logViewerActivity } from "@/lib/activity";

export interface Profile {
  id: string;
  name: string;
  color: string;
  profile_picture_url?: string | null;
  avatar_shape?: string | null;
  birthday?: string | null;
  is_primary?: boolean;
  role?: "self" | "partner";
}

export interface Comment {
  id: string;
  mediaId: string;
  profileId: string;
  text: string;
  timestamp: number;
  videoTime?: number;
}

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  profilesReady: boolean;
  setActiveProfile: (profile: Profile | null) => void;
  refreshProfiles: () => Promise<void>;
  myList: string[];
  toggleMyList: (mediaId: string) => void;
  isInMyList: (mediaId: string) => boolean;
  comments: Comment[];
  addComment: (mediaId: string, text: string, videoTime?: number) => void;
  deleteComment: (id: string) => void;
  updateProfile: (
    id: string,
    name: string,
    color: string,
    profilePictureUrl: string | null,
    avatarShape: string,
    birthday: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
  isGoogleUser: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY_ACTIVE = "usflix_active_profile";
const SESSION_PROFILE_KEY = "usflix_profile_selected_session";

interface ProfileProviderProps {
  children: ReactNode;
  googleUserProfile?: Profile | null;
  isGoogleUser?: boolean;
}

export function ProfileProvider({
  children,
  googleUserProfile = null,
  isGoogleUser = false,
}: ProfileProviderProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [profilesReady, setProfilesReady] = useState(false);
  const [myList, setMyList] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const { isSignedIn, isLoaded } = useAuth();
  const wasSignedIn = useRef(false);

  const refreshProfiles = useCallback(async () => {
    const data = await api.get<Profile[]>("/profiles");
    const list = Array.isArray(data) ? data : [];
    setProfiles(list);
    return;
  }, []);

  // Load profiles once Clerk auth is resolved
  useEffect(() => {
    if (!isLoaded) {
      setProfilesReady(false);
      return;
    }

    if (!isSignedIn) {
      setProfiles([]);
      setActiveProfileState(null);
      setProfilesReady(true);
      wasSignedIn.current = false;
      sessionStorage.removeItem(SESSION_PROFILE_KEY);
      return;
    }

    const freshLogin = !wasSignedIn.current;
    wasSignedIn.current = true;

    if (freshLogin) {
      // New login session — require profile selection before dashboard
      setActiveProfileState(null);
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      sessionStorage.removeItem(SESSION_PROFILE_KEY);
    }

    setProfilesReady(false);
    refreshProfiles()
      .then(() => {
        if (!freshLogin && sessionStorage.getItem(SESSION_PROFILE_KEY)) {
          try {
            const stored = localStorage.getItem(STORAGE_KEY_ACTIVE);
            if (stored) {
              const parsed = JSON.parse(stored) as Profile;
              setProfiles((list) => {
                const match = list.find((p) => p.id === parsed.id);
                if (match) setActiveProfileState(match);
                return list;
              });
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY_ACTIVE);
          }
        }
      })
      .catch(() => setProfiles([]))
      .finally(() => setProfilesReady(true));
  }, [isLoaded, isSignedIn, refreshProfiles]);

  // Legacy Google auto-profile path (unused with Clerk, kept for compatibility)
  useEffect(() => {
    if (isGoogleUser && googleUserProfile) {
      setActiveProfileState(googleUserProfile);
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(googleUserProfile));
      sessionStorage.setItem(SESSION_PROFILE_KEY, "1");
      logViewerActivity("profile_selected", googleUserProfile.id, {
        profileName: googleUserProfile.name,
        restored: true,
        googleUser: true,
      });
    }
  }, [isGoogleUser, googleUserProfile]);

  useEffect(() => {
    if (!activeProfile) {
      setMyList([]);
      return;
    }
    api
      .get<string[]>(`/profiles/${activeProfile.id}/list`)
      .then(setMyList)
      .catch(() => setMyList([]));
  }, [activeProfile]);

  useEffect(() => {
    if (!activeProfile) return;
    api
      .get<Comment[]>("/comments")
      .then(setComments)
      .catch(() => {});
  }, [activeProfile?.id]);

  const setActiveProfile = (profile: Profile | null) => {
    setActiveProfileState(profile);
    if (profile) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(profile));
      sessionStorage.setItem(SESSION_PROFILE_KEY, "1");
      logViewerActivity("profile_selected", profile.id, { profileName: profile.name });
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      sessionStorage.removeItem(SESSION_PROFILE_KEY);
    }
  };

  useEffect(() => {
    if (!activeProfile) return;
    logViewerActivity("profile_heartbeat", activeProfile.id, { profileName: activeProfile.name });
    const interval = window.setInterval(() => {
      logViewerActivity("profile_heartbeat", activeProfile.id, { profileName: activeProfile.name });
    }, 2 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [activeProfile?.id]);

  const toggleMyList = async (mediaId: string) => {
    if (!activeProfile) return;
    const isIn = myList.includes(mediaId);
    setMyList((prev) => (isIn ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]));
    try {
      if (isIn) {
        await api.delete(
          `/profiles/${activeProfile.id}/list/${mediaId}?clientId=${encodeURIComponent(getClientId())}`
        );
      } else {
        await api.post(`/profiles/${activeProfile.id}/list`, { mediaId, clientId: getClientId() });
      }
    } catch {
      setMyList((prev) => (isIn ? [...prev, mediaId] : prev.filter((id) => id !== mediaId)));
    }
  };

  const isInMyList = (mediaId: string) => myList.includes(mediaId);

  const addComment = async (mediaId: string, text: string, videoTime?: number) => {
    if (!activeProfile || !text.trim()) return;
    const tempId = `comment-${Date.now()}`;
    const newComment: Comment = {
      id: tempId,
      mediaId,
      profileId: activeProfile.id,
      text: text.trim(),
      timestamp: Date.now(),
      videoTime,
    };
    setComments((prev) => [...prev, newComment]);
    try {
      const result = await api.post<{ ok: boolean; id: string; timestamp: number }>("/comments", {
        mediaId,
        profileId: activeProfile.id,
        text: text.trim(),
        videoTime,
        clientId: getClientId(),
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, id: result.id, timestamp: result.timestamp } : c
        )
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const deleteComment = async (id: string) => {
    const comment = comments.find((c) => c.id === id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/comments/${id}?clientId=${encodeURIComponent(getClientId())}`);
    } catch {
      if (comment) setComments((prev) => [...prev, comment]);
    }
  };

  const updateProfile = async (
    id: string,
    name: string,
    color: string,
    profilePictureUrl: string | null,
    avatarShape: string,
    birthday: string | null
  ) => {
    try {
      const response = await api.patch<{ ok: boolean }>(`/profiles/${id}`, {
        name,
        color,
        profilePictureUrl,
        avatarShape,
        birthday,
      });
      if (response.ok) {
        const updated = await api.get<Profile[]>("/profiles");
        setProfiles(updated);
        if (activeProfile?.id === id) {
          const matched = updated.find((p) => p.id === id);
          if (matched) setActiveProfile(matched);
        }
        return { ok: true };
      }
      return { ok: false, error: "Failed to update profile" };
    } catch (err: unknown) {
      console.error(err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to update profile",
      };
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        profilesReady,
        setActiveProfile,
        refreshProfiles,
        myList,
        toggleMyList,
        isInMyList,
        comments,
        addComment,
        deleteComment,
        updateProfile,
        isGoogleUser,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
