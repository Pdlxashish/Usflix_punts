/**
 * Extended data model — supports both photo albums (existing) and video
 * Media_Items (Req 2/3/4/12). In the frontend-only phase, video items use
 * a public domain sample video URL so the player can be exercised.
 */

import paris from "@/assets/album-paris.jpg";
import anniversary from "@/assets/album-anniversary.jpg";
import summer from "@/assets/album-summer.jpg";
import winter from "@/assets/album-winter.jpg";
import beach from "@/assets/album-beach.jpg";
import firstdate from "@/assets/album-firstdate.jpg";
import dance from "@/assets/album-dance.jpg";
import roadtrip from "@/assets/album-roadtrip.jpg";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaType = "photo" | "video" | "voice";

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  year: string;
  tagline: string;
  description: string;
  /** Thumbnail image URL. Undefined = show placeholder (Req 12 AC2) */
  thumbnail?: string;
  category: string;
  /** Sort rank within its collection (Req 7 AC5) */
  sortRank: number;
  /** For video items: playback URL (mp4 / HLS .m3u8) */
  videoUrl?: string;
  /** For voice note items: audio URL */
  audioUrl?: string;
  /** For video items: duration in seconds */
  duration?: number;
  /** For photo items: array of photos */
  photos?: { src: string; caption: string }[];
  /** Processing status — ready | storage_failed | processing_failed */
  status: "ready" | "storage_failed" | "processing_failed";
  /** Featured flag - shows in featured section */
  featured?: boolean;
  /** ISO timestamp when the memory was added (for On This Day) */
  createdAt?: string;
  /** Flag indicating if the item was uploaded in the last 24 hours */
  isNew?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  sortRank: number;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  mediaUrl: string; // The uploaded image or video url for the background
  type: "image" | "video";
  linkedMediaId?: string; // Optional link to a MediaItem
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Format seconds as MM:SS (Req 12 AC5) */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Sample video — Big Buck Bunny (public domain, CC BY 3.0) ─────────────────
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_VIDEO_2 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
const SAMPLE_VIDEO_3 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

// ─── Collections ──────────────────────────────────────────────────────────────

export const collections: Collection[] = [
  { id: "travel",       name: "Travel",       sortRank: 1 },
  { id: "adventures",   name: "Adventures",   sortRank: 2 },
  { id: "anniversaries",name: "Anniversaries",sortRank: 3 },
  { id: "getaways",     name: "Getaways",     sortRank: 4 },
  { id: "beginnings",   name: "Beginnings",   sortRank: 5 },
  { id: "moments",      name: "Moments",      sortRank: 6 },
  { id: "videos",       name: "Videos",       sortRank: 7 },
];

export const heroBanners: HeroBanner[] = [
  {
    id: "banner-1",
    title: "Mrs Deactive and Guhiya",
    subtitle: "Every story we've written together, in one place. Press play and let's remember.",
    mediaUrl: paris, // using an existing asset as default
    type: "image",
    linkedMediaId: "video-bbb",
  }
];

// ─── Media items ──────────────────────────────────────────────────────────────

export const mediaItems: MediaItem[] = [
  // ── Photo albums (existing content, migrated to new model) ──────────────────
  {
    id: "paris", type: "photo", title: "Paris, Mon Amour", year: "2024",
    tagline: "A weekend lost in cobblestone streets and golden lights.",
    description: "From midnight strolls along the Seine to croissants at sunrise — the city held us close.",
    thumbnail: paris, category: "Travel", sortRank: 1, status: "ready",
    photos: [
      { src: paris, caption: "Under the tower, the night we lost track of time." },
      { src: dance, caption: "Dancing in a courtyard we found by accident." },
      { src: anniversary, caption: "Wine, candles, and that look you gave me." },
    ],
  },
  {
    id: "anniversary", type: "photo", title: "Three Years", year: "2024",
    tagline: "Candles, wine, and the way you laugh.",
    description: "Three years of inside jokes, slow mornings, and choosing each other again.",
    thumbnail: anniversary, category: "Anniversaries", sortRank: 1, status: "ready",
    photos: [
      { src: anniversary, caption: "The dinner I almost burned." },
      { src: dance, caption: "Our song, the kitchen floor." },
    ],
  },
  {
    id: "summer", type: "photo", title: "Summer Adventures", year: "2023",
    tagline: "Trails, rivers, and sunburned shoulders.",
    description: "A summer of muddy boots, alpine sunrises, and sleeping under stars.",
    thumbnail: summer, category: "Adventures", sortRank: 1, status: "ready",
    photos: [
      { src: summer, caption: "The peak, just before the rain." },
      { src: roadtrip, caption: "The drive there." },
      { src: beach, caption: "And the reward at the coast." },
    ],
  },
  {
    id: "winter", type: "photo", title: "Cabin in the Snow", year: "2023",
    tagline: "Firewood, hot cocoa, and snowflakes on your eyelashes.",
    description: "Two days off-grid, one fireplace, endless quiet.",
    thumbnail: winter, category: "Getaways", sortRank: 1, status: "ready",
    photos: [
      { src: winter, caption: "The cabin glowing through the trees." },
      { src: anniversary, caption: "Cocoa by candlelight." },
    ],
  },
  {
    id: "beach", type: "photo", title: "Our First Trip", year: "2022",
    tagline: "Salt air, cheap wine, and the beginning of everything.",
    description: "Where it all started — sand in our shoes, your hand in mine.",
    thumbnail: beach, category: "Travel", sortRank: 2, status: "ready",
    photos: [
      { src: beach, caption: "Sunset on the first night." },
      { src: firstdate, caption: "Coffee the morning after." },
    ],
  },
  {
    id: "firstdate", type: "photo", title: "First Date", year: "2021",
    tagline: "Two coffees, three hours, one beginning.",
    description: "The little café on the corner — where I knew.",
    thumbnail: firstdate, category: "Beginnings", sortRank: 1, status: "ready",
    photos: [{ src: firstdate, caption: "The coffees that started it all." }],
  },
  {
    id: "dance", type: "photo", title: "Garden Lights", year: "2024",
    tagline: "Slow dancing under string lights.",
    description: "A backyard, a playlist, and you in that dress.",
    thumbnail: dance, category: "Moments", sortRank: 1, status: "ready",
    photos: [{ src: dance, caption: "One more song." }],
  },
  {
    id: "roadtrip", type: "photo", title: "Coastal Road Trip", year: "2023",
    tagline: "Windows down, the whole coast ours.",
    description: "Five days, seven beaches, a thousand songs.",
    thumbnail: roadtrip, category: "Adventures", sortRank: 2, status: "ready",
    photos: [
      { src: roadtrip, caption: "Cliffs at golden hour." },
      { src: beach, caption: "We stopped here for hours." },
    ],
  },

  // ── Video items (Req 4 / 5) ──────────────────────────────────────────────────
  {
    id: "video-bbb", type: "video", title: "Big Buck Bunny", year: "2024",
    tagline: "A short animated film — our favourite lazy Sunday watch.",
    description: "Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself.",
    thumbnail: summer,   // using existing asset as placeholder thumbnail
    category: "Videos", sortRank: 1, status: "ready",
    videoUrl: SAMPLE_VIDEO,
    duration: 596,
  },
  {
    id: "video-ed", type: "video", title: "Elephants Dream", year: "2023",
    tagline: "The first open-source animated short film.",
    description: "Two strange characters explore a capricious and seemingly infinite machine.",
    thumbnail: paris,
    category: "Videos", sortRank: 2, status: "ready",
    videoUrl: SAMPLE_VIDEO_2,
    duration: 654,
  },
  {
    id: "video-blazes", type: "video", title: "For Bigger Blazes", year: "2023",
    tagline: "A cinematic short — fire and light.",
    description: "A short film about the beauty of fire and light in the natural world.",
    // No thumbnail — tests placeholder rendering (Req 12 AC2)
    category: "Videos", sortRank: 3, status: "ready",
    videoUrl: SAMPLE_VIDEO_3,
    duration: 15,
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const getMediaItem = (id: string) => mediaItems.find((m) => m.id === id);

export const getCollection = (id: string) => collections.find((c) => c.id === id);

export const getItemsByCategory = (category: string) =>
  mediaItems
    .filter((m) => m.category === category && m.status === "ready")
    .sort((a, b) => a.sortRank - b.sortRank);

/** Rows for the home page browse view (Req 12 AC1) */
export const browseRows = [
  { collectionId: "travel",        title: "Travel & Getaways" },
  { collectionId: "adventures",    title: "Adventures" },
  { collectionId: "anniversaries", title: "Anniversaries" },
  { collectionId: "moments",       title: "Quiet Moments" },
  { collectionId: "beginnings",    title: "From the Beginning" },
  { collectionId: "videos",        title: "Videos" },
];
