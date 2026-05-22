/**
 * MediaCard — Req 12 (AC2 thumbnail placeholder, AC4 highlight, AC5 hover overlay)
 * Used in browse rows and grid views.
 */
import { useState, useRef, useCallback } from "react";
import { Play, Film, Plus, Check, ZoomIn } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { MediaItem } from "@/data/media";
import { formatDuration } from "@/data/media";
import { useProfile } from "@/context/profile";
import { useHeartRainfall } from "@/context/heartRainfall";
import { getMediaUrl } from "@/config/api";

// ─── Substring highlight helper (Req 12 AC4) ─────────────────────────────────
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/40 text-foreground rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Placeholder image (Req 12 AC2) ──────────────────────────────────────────
function ThumbnailPlaceholder({ title }: { title: string }) {
  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-card to-muted flex flex-col items-center justify-center gap-2"
      aria-label={`No thumbnail for ${title}`}
    >
      <Film className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest px-4 text-center line-clamp-2">
        {title}
      </p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MediaCardProps {
  item: MediaItem;
  collectionName: string;
  searchQuery?: string;
  onPlay?: (item: MediaItem) => void;
  /** Link href — used when not playing inline */
  href?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MediaCard({
  item, collectionName, searchQuery = "", onPlay, href, className = "", style,
}: MediaCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toggleMyList, isInMyList } = useProfile();
  const { triggerHeartBurst } = useHeartRainfall();
  
  const inList = isInMyList(item.id);

  // Handle love button click with heart rainfall
  const handleLoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMyList(item.id);
    
    if (!inList) {
      triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY });
    }
  };

  // Req 12 AC5: show overlay after 500 ms continuous hover
  const onMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHovered(true), 500);
    
    // Start video preview for video items
    if (item.type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [item.type]);
  
  const onMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(false);
    
    // Stop video preview
    if (item.type === "video" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [item.type]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (item.type === "video") {
      if (onPlay) {
        onPlay(item);
      } else {
        navigate({ to: "/watch/$mediaId", params: { mediaId: item.id } });
      }
    } else if (item.type === "photo") {
      navigate({ to: "/albums/$albumId", params: { albumId: item.id } });
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className={`snap-start shrink-0 w-[42vw] max-w-[168px] xs:max-w-[180px] sm:w-[200px] sm:max-w-none md:w-[260px] lg:w-[290px] aspect-[2/3] rounded-lg overflow-hidden relative group/card shadow-[var(--shadow-card)] transition-all duration-300 sm:hover:scale-[1.05] sm:hover:z-10 sm:hover:shadow-[0_30px_60px_-10px_oklch(0_0_0/0.8)] cursor-pointer touch-manipulation ${className}`}
      role="button"
      aria-label={item.type === "video" ? `Play ${item.title}` : `View ${item.title}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {/* Thumbnail or placeholder */}
      {item.type === "video" && item.videoUrl ? (
        <>
          {/* Thumbnail image - always visible */}
          {item.thumbnail && (
            <img
              src={getMediaUrl(item.thumbnail)}
              alt={item.title}
              loading="lazy"
              width="290"
              height="435"
              decoding="async"
              style={{ objectFit: 'cover' }}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover/card:opacity-0"
              onError={(e) => {
                console.error('Failed to load thumbnail:', item.thumbnail);
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {/* Video preview - plays on hover */}
          <video
            ref={videoRef}
            src={getMediaUrl(item.videoUrl)}
            muted
            loop
            playsInline
            preload="none"
            style={{ objectFit: 'cover' }}
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
            onLoadedMetadata={(e) => {
              // Limit preview to 3 seconds
              const video = e.currentTarget;
              video.addEventListener('timeupdate', () => {
                if (video.currentTime >= 3) {
                  video.currentTime = 0;
                }
              });
            }}
          />
          {!item.thumbnail && <ThumbnailPlaceholder title={item.title} />}
        </>
      ) : item.thumbnail ? (
        <img
          src={getMediaUrl(item.thumbnail)}
          alt={item.title}
          loading="lazy"
          width="290"
          height="435"
          decoding="async"
          style={{ objectFit: 'cover' }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
          onError={(e) => {
            console.error('Failed to load thumbnail:', item.thumbnail);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <ThumbnailPlaceholder title={item.title} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80 group-hover/card:opacity-100 transition-opacity duration-300" />

      {/* Play/View button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
        <div className="bg-primary/90 rounded-full p-3 shadow-[var(--shadow-glow)] scale-75 group-hover/card:scale-100 transition-transform duration-300">
          {item.type === "video" ? (
            <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
          ) : (
            <ZoomIn className="h-6 w-6 text-primary-foreground" />
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="absolute inset-x-0 bottom-0 p-4 translate-y-1 group-hover/card:translate-y-0 transition-transform duration-300">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
          {item.category} · {item.year}
        </p>
        <h3 className="font-display text-lg text-foreground leading-tight">
          <HighlightText text={item.title} query={searchQuery} />
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 leading-relaxed">
          {item.tagline}
        </p>
        <div className="mt-2 flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
          {item.type === "video" && item.duration != null && (
            <span className="text-[10px] border border-foreground/30 px-1.5 py-0.5 rounded text-foreground/60">
              {formatDuration(item.duration)}
            </span>
          )}
          {item.type === "photo" && item.photos && (
            <span className="text-[10px] border border-foreground/30 px-1.5 py-0.5 rounded text-foreground/60">
              {item.photos.length} photos
            </span>
          )}
        </div>
      </div>

      {/* Hover overlay (Req 12 AC5) — title + collection + duration */}
      {hovered && (
        <div className="absolute inset-x-0 top-0 bg-black/70 backdrop-blur-sm px-4 py-3 animate-in fade-in duration-150">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary">{collectionName}</p>
          <p className="font-display text-base text-white leading-tight pr-8">{item.title}</p>
          {item.type === "video" && item.duration != null && (
            <p className="text-xs text-white/60 mt-0.5">{formatDuration(item.duration)}</p>
          )}
          
          <button
            onClick={handleLoveClick}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 transition-all border border-white/20 backdrop-blur"
            aria-label={inList ? "Remove from My List" : "Add to My List"}
            title={inList ? "Remove from My List" : "Add to My List"}
          >
            {inList ? <Check className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-white" />}
          </button>
        </div>
      )}

      {/* Ring glow on hover */}
      <div className="absolute inset-0 rounded-lg ring-0 group-hover/card:ring-1 ring-primary/40 transition-all pointer-events-none" />
    </div>
  );
}
