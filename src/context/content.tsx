/**
 * Content management context — uses backend API for CRUD.
 * Manages Collections, Media_Items, and Hero Banners via REST endpoints.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@/lib/api";
import { useProfile } from "@/context/profile";
import {
  type Collection,
  type MediaItem,
  type HeroBanner,
} from "@/data/media";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentContextValue {
  collections: Collection[];
  mediaItems: MediaItem[];
  heroBanners: HeroBanner[];

  // Collections
  createCollection: (data: { name: string; description?: string; parentId?: string }) => Promise<Result>;
  updateCollection: (id: string, data: { name?: string; description?: string }) => Promise<Result>;
  deleteCollection: (id: string, mode: "delete-items" | "move-to-parent") => Promise<Result>;
  getNestingDepth: (id: string) => number;

  // Media
  updateMediaItem: (id: string, data: { title?: string; description?: string; tagline?: string; thumbnail?: string; sortRank?: number; category?: string; featured?: boolean }) => Promise<Result>;
  moveMediaToCollection: (mediaId: string, targetCollectionId: string) => Promise<Result>;

  // Deletion
  deleteMediaItem: (id: string) => Promise<Result>;

  // Hero Banners
  createHeroBanner: (data: Omit<HeroBanner, "id">) => Promise<Result>;
  deleteHeroBanner: (id: string) => Promise<Result>;

  // Refresh
  refreshData: () => Promise<void>;
}

interface Result {
  ok: boolean;
  error?: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const { isSignedIn, isLoaded } = useAuth();
  const { activeProfile, profilesReady, profiles } = useProfile();

  const canFetch = isLoaded && isSignedIn && profilesReady && !!activeProfile;
  const profileScopeKey = profiles.map((p) => p.id).join(",");

  const refreshData = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !profilesReady || !activeProfile) return;
    try {
      const [cols, media, banners] = await Promise.all([
        api.get<Collection[]>("/collections"),
        api.get<MediaItem[]>("/media"),
        api.get<HeroBanner[]>("/banners"),
      ]);
      setCollections(cols);
      setMediaItems(media);
      setHeroBanners(banners);
    } catch (err) {
      console.warn("Failed to load from API:", err);
      setCollections([]);
      setMediaItems([]);
      setHeroBanners([]);
    }
  }, [isLoaded, isSignedIn, profilesReady, activeProfile]);

  useEffect(() => {
    if (!canFetch) {
      setCollections([]);
      setMediaItems([]);
      setHeroBanners([]);
      return;
    }
    refreshData();
  }, [canFetch, refreshData, profileScopeKey]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getNestingDepth = useCallback((id: string): number => {
    let depth = 0;
    let current = collections.find((c) => c.id === id);
    while (current?.parentId) {
      depth++;
      current = collections.find((c) => c.id === current!.parentId);
      if (depth > 10) break;
    }
    return depth;
  }, [collections]);

  // ── Collections ────────────────────────────────────────────────────────────

  const createCollection = useCallback(async (data: { name: string; description?: string; parentId?: string }): Promise<Result> => {
    try {
      const result = await api.post<Result>("/collections", data);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  const updateCollection = useCallback(async (id: string, data: { name?: string; description?: string }): Promise<Result> => {
    try {
      const result = await api.put<Result>(`/collections/${id}`, data);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  const deleteCollection = useCallback(async (id: string, mode: "delete-items" | "move-to-parent"): Promise<Result> => {
    try {
      const result = await api.delete<Result>(`/collections/${id}?mode=${mode}`);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  // ── Media ──────────────────────────────────────────────────────────────────

  const updateMediaItem = useCallback(async (id: string, data: any): Promise<Result> => {
    try {
      const result = await api.put<Result>(`/media/${id}`, data);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  const moveMediaToCollection = useCallback(async (mediaId: string, targetCollectionId: string): Promise<Result> => {
    try {
      const result = await api.post<Result>(`/media/${mediaId}/move`, { collectionId: targetCollectionId });
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  const deleteMediaItem = useCallback(async (id: string): Promise<Result> => {
    try {
      const result = await api.delete<Result>(`/media/${id}`);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  // ── Hero Banners ───────────────────────────────────────────────────────────

  const createHeroBanner = useCallback(async (data: Omit<HeroBanner, "id">): Promise<Result> => {
    try {
      const result = await api.post<Result>("/banners", data);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  const deleteHeroBanner = useCallback(async (id: string): Promise<Result> => {
    try {
      const result = await api.delete<Result>(`/banners/${id}`);
      await refreshData();
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [refreshData]);

  return (
    <ContentContext.Provider
      value={{
        collections,
        mediaItems,
        heroBanners,
        createCollection,
        updateCollection,
        deleteCollection,
        getNestingDepth,
        updateMediaItem,
        moveMediaToCollection,
        deleteMediaItem,
        createHeroBanner,
        deleteHeroBanner,
        refreshData,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used inside ContentProvider");
  return ctx;
}
