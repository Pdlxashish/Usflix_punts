/**
 * Profile context — uses backend API for My List and Comments.
 * Active profile selection stays in localStorage (client-only concern).
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getClientId, logViewerActivity } from "@/lib/activity";

export interface Profile {
  id: string;
  name: string;
  color: string;
  profile_picture_url?: string | null;
  avatar_shape?: string | null;
  birthday?: string | null;
}

export const DEFAULT_PROFILES: Profile[] = [
  { id: "p1", name: "You", color: "bg-blue-500" },
  { id: "p2", name: "Me", color: "bg-rose-500" },
  { id: "p3", name: "Us", color: "bg-purple-500" },
];

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
  setActiveProfile: (profile: Profile | null) => void;
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
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY_ACTIVE = "usflix_active_profile";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [myList, setMyList] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Load profiles from API
  useEffect(() => {
    api.get<Profile[] | { ok?: boolean }>("/profiles")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProfiles(data);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  // Hydrate active profile from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (stored) {
        try {
          const profile: Profile = JSON.parse(stored);
          setActiveProfileState(profile);
          logViewerActivity("profile_selected", profile.id, {
            profileName: profile.name,
            restored: true,
          });
        } catch { /* ignore */ }
      }
    }
  }, []);

  // Load my list when active profile changes
  useEffect(() => {
    if (!activeProfile) { setMyList([]); return; }
    api.get<string[]>(`/profiles/${activeProfile.id}/list`)
      .then(setMyList)
      .catch(() => setMyList([]));
  }, [activeProfile]);

  // Load all comments on mount
  useEffect(() => {
    api.get<Comment[]>("/comments")
      .then(setComments)
      .catch(() => { /* keep empty */ });
  }, []);

  const setActiveProfile = (profile: Profile | null) => {
    setActiveProfileState(profile);
    if (profile) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(profile));
      logViewerActivity("profile_selected", profile.id, { profileName: profile.name });
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  };

  // Keep session alive while a profile is active
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
    // Optimistic update
    setMyList((prev) => isIn ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]);
    try {
      if (isIn) {
        await api.delete(`/profiles/${activeProfile.id}/list/${mediaId}?clientId=${encodeURIComponent(getClientId())}`);
      } else {
        await api.post(`/profiles/${activeProfile.id}/list`, { mediaId, clientId: getClientId() });
      }
    } catch {
      // Revert on error
      setMyList((prev) => isIn ? [...prev, mediaId] : prev.filter((id) => id !== mediaId));
    }
  };

  const isInMyList = (mediaId: string) => myList.includes(mediaId);

  const addComment = async (mediaId: string, text: string, videoTime?: number) => {
    if (!activeProfile || !text.trim()) return;
    const tempId = `comment-${Date.now()}`;
    const newComment: Comment = {
      id: tempId, mediaId, profileId: activeProfile.id,
      text: text.trim(), timestamp: Date.now(), videoTime,
    };
    // Optimistic update
    setComments((prev) => [...prev, newComment]);
    try {
      const result = await api.post<{ ok: boolean; id: string; timestamp: number }>("/comments", {
        mediaId, profileId: activeProfile.id, text: text.trim(), videoTime, clientId: getClientId(),
      });
      // Update with real ID
      setComments((prev) => prev.map((c) =>
        c.id === tempId ? { ...c, id: result.id, timestamp: result.timestamp } : c
      ));
    } catch {
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const deleteComment = async (id: string) => {
    const comment = comments.find((c) => c.id === id);
    // Optimistic update
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/comments/${id}?clientId=${encodeURIComponent(getClientId())}`);
    } catch {
      // Revert
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
      const response = await api.put<{ ok: boolean }>(`/profiles/${id}`, {
        name,
        color,
        profilePictureUrl,
        avatarShape,
        birthday,
      });
      if (response.ok) {
        const updated = await api.get<Profile[]>("/profiles");
        setProfiles(updated);
        if (activeProfile && activeProfile.id === id) {
          const matched = updated.find((p) => p.id === id);
          if (matched) setActiveProfile(matched);
        }
        return { ok: true };
      }
      return { ok: false, error: "Failed to update profile" };
    } catch (err: any) {
      console.error(err);
      return { ok: false, error: err.message || "Failed to update profile" };
    }
  };

  return (
    <ProfileContext.Provider value={{
      profiles, activeProfile, setActiveProfile,
      myList, toggleMyList, isInMyList,
      comments, addComment, deleteComment,
      updateProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
