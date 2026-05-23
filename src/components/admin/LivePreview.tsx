/**
 * Live Preview Component - Real-time preview of homepage with actual layout
 * Shows Hero, ContentRows, TimeTogether, and StoryContinues sections
 */
import { useState, useEffect, useMemo, useRef, memo } from "react";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Maximize2,
  Minimize2,
  Heart,
  Calendar,
  Play,
  Camera,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useBranding } from "@/context/branding";
import { useContent } from "@/context/content";
import { getMediaUrl } from "@/lib/api";
import type { MediaItem, HeroBanner } from "@/data/media";

interface LivePreviewProps {
  mediaItems: MediaItem[];
}

// Mini Hero Preview Component
const MiniHero = memo(function MiniHero() {
  const { branding } = useBranding();
  const { heroBanners, mediaItems } = useContent();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const activeBanner = heroBanners[currentIndex] || null;
  const linkedItem = activeBanner?.linkedMediaId
    ? mediaItems.find((m) => m.id === activeBanner.linkedMediaId)
    : null;

  const rawMediaUrl = activeBanner?.mediaUrl ?? "";
  const isBlobUrl = rawMediaUrl.startsWith("blob:");
  const isVideoBackground = activeBanner?.type === "video" && !isBlobUrl && rawMediaUrl !== "";
  const mediaUrl = isBlobUrl || !rawMediaUrl ? "" : getMediaUrl(rawMediaUrl);

  const title = activeBanner?.title || branding.heroTagline || "Our Story";
  const subtitle = activeBanner?.subtitle || branding.heroSubtitle || "";

  // Auto-advance carousel
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    setImageError(false); // Reset error state when banner changes
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  // Get animation class based on branding setting
  const animationClass =
    branding.heroAnimation !== "none"
      ? `motion-safe:animate-[${branding.heroAnimation}_24s_ease-in-out_infinite_alternate]`
      : "";

  return (
    <div className="relative h-40 w-full overflow-hidden bg-black rounded-t-lg">
      {/* Background */}
      {mediaUrl && !imageError && (
        <div className="absolute inset-0">
          {isVideoBackground ? (
            <video
              key={mediaUrl}
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <img
              key={mediaUrl}
              src={mediaUrl}
              alt="Hero"
              className={`w-full h-full object-cover scale-105 ${animationClass}`}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end p-4">
        <div className="w-full">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="h-px w-4 bg-primary" />
            <p className="text-[8px] uppercase tracking-wider text-primary">Featured</p>
          </div>
          <h3 className="font-display text-base leading-tight text-white line-clamp-1">{title}</h3>
          {subtitle && (
            <p className="text-[9px] text-white/70 line-clamp-2 mt-1 leading-relaxed">{subtitle}</p>
          )}

          {/* Carousel indicators */}
          {heroBanners.length > 1 && (
            <div className="flex gap-1.5 mt-2.5">
              {heroBanners.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 rounded-full transition-all ${
                    i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="h-2.5 w-2.5 text-white/40 animate-bounce" />
      </div>
    </div>
  );
});

// Mini Content Row Component
const MiniContentRow = memo(function MiniContentRow({
  title,
  items,
}: {
  title: string;
  items: MediaItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    <div className="py-3">
      <div className="px-4 mb-2 flex items-baseline justify-between">
        <h4 className="font-display text-sm text-foreground">{title}</h4>
        <span className="text-[9px] text-muted-foreground">{items.length}</span>
      </div>
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1">
        {items.slice(0, 8).map((item) => (
          <div
            key={item.id}
            className="shrink-0 w-20 aspect-[2/3] rounded overflow-hidden bg-muted group relative"
          >
            {item.thumbnail ? (
              <img
                src={getMediaUrl(item.thumbnail)}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">No thumb</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 p-1.5 translate-y-1 group-hover:translate-y-0 transition-transform">
              <p className="text-[7px] text-primary uppercase tracking-wider line-clamp-1">
                {item.category}
              </p>
              <p className="text-[9px] font-medium text-foreground line-clamp-1">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Mini Time Together Component
const MiniTimeTogether = memo(function MiniTimeTogether() {
  const { branding } = useBranding();
  const [time, setTime] = useState({ years: 0, months: 0, days: 0, totalDays: 0 });

  useEffect(() => {
    const since = new Date(branding.relationshipStartDate);
    const updateTime = () => {
      const now = new Date();
      const totalMs = Math.max(0, now.getTime() - since.getTime());
      const totalDays = Math.floor(totalMs / 86400000);

      let years = now.getFullYear() - since.getFullYear();
      let months = now.getMonth() - since.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      if (now.getDate() < since.getDate()) {
        months--;
        if (months < 0) {
          years--;
          months += 11;
        }
      }

      const days = totalDays % 30;
      setTime({ years, months, days, totalDays });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [branding.relationshipStartDate]);

  const since = new Date(branding.relationshipStartDate);
  const sinceLabel = since.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="py-5 px-4 relative">
      <div className="text-center">
        <Heart className="h-5 w-5 mx-auto fill-primary text-primary animate-pulse mb-2.5" />
        <h4 className="font-display text-base">Time Together</h4>
        <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1.5 mt-1.5">
          <Calendar className="h-2.5 w-2.5" />
          Since {sinceLabel} · {time.totalDays.toLocaleString()} days
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Years", time.years],
            ["Months", time.months],
            ["Days", time.days],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="bg-card/60 border border-border/60 rounded-lg py-2.5 px-1.5"
            >
              <p className="font-display text-xl text-foreground tabular-nums">{value as number}</p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground">
                {label as string}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Mini Story Continues Component
const MiniStoryContinues = memo(function MiniStoryContinues() {
  const { collections, mediaItems } = useContent();

  const stats = useMemo(() => {
    const albumCount = collections.length;
    const photoCount = mediaItems.filter((item) => item.type === "photo").length;
    const videoCount = mediaItems.filter((item) => item.type === "video").length;

    return { albums: albumCount, photos: photoCount, videos: videoCount };
  }, [collections, mediaItems]);

  const highlights = [
    { icon: Heart, label: `${stats.albums} Album${stats.albums !== 1 ? "s" : ""}` },
    { icon: Camera, label: `${stats.photos}+ Photo${stats.photos !== 1 ? "s" : ""}` },
    {
      icon: Sparkles,
      label:
        stats.videos > 0 ? `${stats.videos} Video${stats.videos !== 1 ? "s" : ""}` : "Every Moment",
    },
  ];

  return (
    <div className="py-5 px-4 text-center">
      <div className="relative inline-block mb-2.5">
        <Heart className="h-6 w-6 mx-auto fill-primary text-primary" />
      </div>
      <h4 className="font-display text-base leading-tight">
        Our Story
        <br />
        <span className="text-primary italic">Continues</span>
        <span className="text-primary">…</span>
      </h4>
      <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
        Every day brings new moments to treasure
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {highlights.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-3 py-1.5"
          >
            <Icon className="h-2.5 w-2.5 text-primary" />
            <p className="text-[9px] font-medium text-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

// Main Live Preview Component
export function LivePreview({ mediaItems }: LivePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const { collections } = useContent();

  // Track updates to show refresh indicator
  useEffect(() => {
    setLastUpdate(Date.now());
  }, [mediaItems, collections]);

  // Build category rows
  const browseRows = useMemo(() => {
    const allCategories = Array.from(new Set(mediaItems.map((m) => m.category).filter(Boolean)));
    return allCategories
      .map((cat) => ({
        title: cat,
        items: mediaItems
          .filter((m) => m.category === cat && m.status === "ready" && m.type !== "voice")
          .sort((a, b) => a.sortRank - b.sortRank),
      }))
      .filter((row) => row.items.length > 0);
  }, [mediaItems]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-[0_10px_40px_-10px_oklch(0_0_0/0.5)] hover:shadow-[0_20px_60px_-10px_oklch(0_0_0/0.6)] hover:scale-105 transition-all duration-200 font-medium"
      >
        <Eye className="h-4 w-4" />
        Live Preview
      </button>
    );
  }

  const containerClass = isExpanded
    ? "fixed inset-4 z-50 bg-card border border-border rounded-xl shadow-[0_20px_60px_-10px_oklch(0_0_0/0.6)] animate-in zoom-in-95 duration-300 flex flex-col"
    : "fixed bottom-6 right-6 z-50 w-[420px] max-h-[680px] bg-card border border-border rounded-xl shadow-[0_20px_60px_-10px_oklch(0_0_0/0.6)] animate-in slide-in-from-bottom-4 duration-300 flex flex-col";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur rounded-t-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Live Preview</h3>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-primary transition-colors p-1 hover:bg-primary/10 rounded"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors p-1 hover:bg-primary/10 rounded"
            title="Open website in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-destructive/10 rounded"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preview Content - Scrollable */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40"
        style={{ maxHeight: isExpanded ? "calc(100vh - 140px)" : "580px" }}
      >
        {/* Hero Section */}
        <MiniHero />

        {/* Content Rows */}
        <div className="bg-background">
          {browseRows.length > 0 ? (
            browseRows.map((row) => (
              <MiniContentRow key={row.title} title={row.title} items={row.items} />
            ))
          ) : (
            <div className="py-10 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Camera className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground">No memories yet</p>
            </div>
          )}

          {/* Time Together Section */}
          <MiniTimeTogether />

          {/* Story Continues Section */}
          <MiniStoryContinues />
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-border px-4 py-2.5 bg-card/95 backdrop-blur rounded-b-xl shrink-0">
        <p className="text-[10px] text-center text-muted-foreground">
          {mediaItems.length} total memories · {collections.length} collections · Updates
          automatically
        </p>
      </div>
    </div>
  );
}
