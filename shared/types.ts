/**
 * Shared types used by both frontend and backend.
 * Single source of truth for all data models.
 */

// ─── Media ────────────────────────────────────────────────────────────────────

export type MediaType = "photo" | "video";

export type MediaStatus = "ready" | "storage_failed" | "processing_failed";

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  year: string;
  tagline: string;
  description: string;
  /** Thumbnail image URL */
  thumbnail?: string;
  category: string;
  /** Sort rank within its collection */
  sortRank: number;
  /** For video items: playback URL (mp4 / HLS) */
  videoUrl?: string;
  /** For video items: duration in seconds */
  duration?: number;
  /** For photo items: array of photos */
  photos?: { src: string; caption: string }[];
  /** Processing status */
  status: MediaStatus;
}

// ─── Collections ──────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  sortRank: number;
}

// ─── Hero Banners ─────────────────────────────────────────────────────────────

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  mediaUrl: string;
  type: "image" | "video";
  linkedMediaId?: string;
}

// ─── Branding ─────────────────────────────────────────────────────────────────

export interface BrandingConfig {
  platformName: string;
  heroTagline: string;
  heroSubtitle: string;
  footerText: string;
  homePageTitle: string;
  homePageDescription: string;
  relationshipStartDate: string;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  color: string;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  mediaId: string;
  profileId: string;
  text: string;
  timestamp: number;
  videoTime?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  ok: boolean;
  error?: string;
  username?: string;
}

export interface ApiResult {
  ok: boolean;
  error?: string;
}

// ─── My List ──────────────────────────────────────────────────────────────────

export interface MyListEntry {
  profileId: string;
  mediaId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format seconds as MM:SS */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
