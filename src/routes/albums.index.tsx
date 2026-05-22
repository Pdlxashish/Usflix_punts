/**
 * /albums — browse all media items
 * Req 12: search (AC3), highlight (AC4), thumbnail placeholder (AC2), hover overlay (AC5)
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Grid3X3, LayoutList, Play, Film, ZoomIn } from "lucide-react";
import { formatDuration, type MediaItem } from "@/data/media";
import { HighlightText } from "@/components/site/MediaCard";
import { getMediaUrl } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";

export const Route = createFileRoute("/albums/")({
  component: AlbumsIndex,
  head: () => ({
    meta: [
      { title: "All Albums — USFLIX" },
      { name: "description", content: "Browse every album and video of our memories." },
    ],
  }),
});

function AlbumsIndex() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch media items from backend
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch("/api/media", { credentials: "include" });
        if (res.ok) {
          const data: MediaItem[] = await res.json();
          setMediaItems(data.filter(m => m.status === "ready"));
        } else {
          setMediaItems([]);
        }
      } catch (error) {
        console.error("Failed to fetch media:", error);
        setMediaItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(mediaItems.map(m => m.category))).filter(Boolean);
    return ["All", ...cats];
  }, [mediaItems]);

  // Req 12 AC3: case-insensitive substring match on title + category
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return mediaItems.filter((m) => {
      const matchCat = activeCategory === "All" || m.category === activeCategory;
      const matchQ   = !q || q.length < 2
        ? true
        : m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.tagline.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, activeCategory, mediaItems]);

  const handlePlay = (item: MediaItem) => {
    navigate({ to: "/watch/$mediaId", params: { mediaId: item.id } });
  };

  if (loading) {
    return (
      <div className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-12 max-w-[1600px] mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-foreground mb-2">All Albums</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-12 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-foreground mb-2">All Albums</h1>
        <p className="text-muted-foreground">Every chapter of us — {mediaItems.length} items.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search — Req 12 AC3 */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search albums and videos…"
            aria-label="Search albums and videos"
            className="w-full bg-card/60 border border-border rounded-md pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring backdrop-blur"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-card/60 border border-border rounded-md p-1 self-start" role="group" aria-label="View mode">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded transition-colors motion-reduce:transition-none ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded transition-colors motion-reduce:transition-none ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8 mt-12" role="group" aria-label="Filter by category">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 motion-reduce:transition-none border ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                : "bg-card/50 text-muted-foreground border-border/60 hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {cat}
            {cat !== "All" && (
              <span className="ml-1.5 text-[10px] opacity-60">
                {mediaItems.filter((m) => m.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(query.length >= 2 || activeCategory !== "All") && (
        <p className="text-sm text-muted-foreground mb-6" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "item" : "items"} found
        </p>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[2/3] overflow-hidden rounded-lg shadow-[var(--shadow-card)] hover:scale-[1.04] hover:z-10 transition-all duration-300 motion-reduce:transition-none hover:shadow-[0_30px_60px_-10px_oklch(0_0_0/0.8)] cursor-pointer"
              onClick={() => {
                if (item.type === "video") {
                  handlePlay(item);
                } else if (item.type === "photo") {
                  navigate({ to: "/albums/$albumId", params: { albumId: item.id } });
                }
              }}
              role="button"
              aria-label={item.type === "video" ? `Play ${item.title}` : `View ${item.title} album`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (item.type === "video") {
                    handlePlay(item);
                  } else if (item.type === "photo") {
                    navigate({ to: "/albums/$albumId", params: { albumId: item.id } });
                  }
                }
              }}
            >
              {/* Thumbnail or placeholder (Req 12 AC2) */}
              {item.thumbnail ? (
                <img
                  src={getMediaUrl(item.thumbnail)}
                  alt={item.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-card to-muted flex flex-col items-center justify-center gap-2">
                  <Film className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest px-4 text-center">{item.title}</p>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity motion-reduce:transition-none" />

              {/* Play button for videos, View icon for photos */}
              {item.type === "video" ? (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
                  <div className="bg-primary/90 rounded-full p-3 shadow-[var(--shadow-glow)]">
                    <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
                  </div>
                </div>
              ) : item.type === "photo" ? (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
                  <div className="bg-primary/90 rounded-full p-3 shadow-[var(--shadow-glow)]">
                    <ZoomIn className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
                  {item.category} · {item.year}
                </p>
                {/* Req 12 AC4: highlight matching substring */}
                <h3 className="font-display text-xl leading-tight">
                  <HighlightText text={item.title} query={query} />
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
                  {item.tagline}
                </p>
              </div>
              <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-1 ring-primary/30 transition-all motion-reduce:transition-none pointer-events-none" />
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex gap-5 items-center bg-card/50 border border-border/50 rounded-lg p-4 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 motion-reduce:transition-none cursor-pointer"
              onClick={() => {
                if (item.type === "video") {
                  handlePlay(item);
                } else if (item.type === "photo") {
                  navigate({ to: "/albums/$albumId", params: { albumId: item.id } });
                }
              }}
              role="button"
              aria-label={item.type === "video" ? `Play ${item.title}` : `View ${item.title} album`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (item.type === "video") {
                    handlePlay(item);
                  } else if (item.type === "photo") {
                    navigate({ to: "/albums/$albumId", params: { albumId: item.id } });
                  }
                }
              }}
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-20 h-28 rounded-md overflow-hidden shadow-[var(--shadow-card)]">
                {item.thumbnail ? (
                  <img
                    src={getMediaUrl(item.thumbnail)}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Film className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
                  {item.category} · {item.year}
                </p>
                <h3 className="font-display text-2xl group-hover:text-primary transition-colors motion-reduce:transition-none">
                  <HighlightText text={item.title} query={query} />
                </h3>
                <p className="font-display italic text-foreground/70 mt-1">{item.tagline}</p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2">
                {item.type === "video" && item.duration != null && (
                  <span className="text-xs text-muted-foreground border border-border/50 rounded px-2 py-1">
                    {formatDuration(item.duration)}
                  </span>
                )}
                {item.type === "photo" && item.photos && (
                  <span className="text-xs text-muted-foreground border border-border/50 rounded px-2 py-1">
                    {item.photos.length} photos
                  </span>
                )}
                {item.type === "video" && (
                  <Play className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none" aria-hidden="true" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
            <Film className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <p className="font-display text-3xl text-foreground/40 mb-2">No memories found</p>
          <p className="text-muted-foreground mt-2 mb-6">
            {query || activeCategory !== "All" 
              ? "Try a different search or category." 
              : "Start uploading your memories to see them here."}
          </p>
          {(query || activeCategory !== "All") && (
            <button
              onClick={() => { setQuery(""); setActiveCategory("All"); }}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
          {!query && activeCategory === "All" && (
            <a
              href="/admin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]"
            >
              Go to Admin Panel
            </a>
          )}
        </div>
      )}

      {/* Inline video player fallback */}
      {playingItem && playingItem.videoUrl && (
        <VideoPlayer
          mediaId={playingItem.id}
          src={playingItem.videoUrl}
          title={playingItem.title}
          collectionName={playingItem.category}
          onClose={() => setPlayingItem(null)}
        />
      )}
    </div>
  );
}
