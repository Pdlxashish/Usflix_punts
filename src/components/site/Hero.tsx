import { Link, useNavigate } from "@tanstack/react-router";
import { Play, Info, ChevronDown, Plus, Check, X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useBranding } from "@/context/branding";
import { useContent } from "@/context/content";
import { useProfile } from "@/context/profile";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { formatDuration } from "@/data/media";
import type { MediaItem } from "@/data/media";
import heroFallback from "@/assets/hero-sunset.jpg";
import { getMediaUrl } from "@/config/api";

// ─── Inline Photo Lightbox ────────────────────────────────────────────────────
function PhotoLightbox({
  item,
  onClose,
}: {
  item: MediaItem;
  onClose: () => void;
}) {
  const photos = item.photos ?? [];
  const [idx, setIdx] = useState(0);

  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  if (photos.length === 0) return null;
  const photo = photos[idx];
  const src = typeof photo === "string" ? photo : photo.src;
  const caption = typeof photo === "string" ? item.title : photo.caption;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">{item.category} · {item.year}</p>
          <h2 className="font-display text-xl text-white">{item.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50">{idx + 1} / {photos.length}</span>
          <button
            onClick={onClose}
            className="bg-white/10 border border-white/20 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Prev arrow */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 md:left-8 z-10 bg-black/50 border border-white/20 rounded-full p-3 text-white/80 hover:text-white hover:border-white/50 transition-all"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-5xl max-h-[80vh] mx-20 md:mx-28 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={idx}
          src={src}
          alt={caption}
          className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-[0_40px_80px_-20px_oklch(0_0_0/0.9)] animate-in zoom-in-95 duration-200"
        />
        {caption && (
          <p className="font-display italic text-white/70 text-center text-base animate-in fade-in duration-300">
            {caption}
          </p>
        )}
      </div>

      {/* Next arrow */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 md:right-8 z-10 bg-black/50 border border-white/20 rounded-full p-3 text-white/80 hover:text-white hover:border-white/50 transition-all"
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="scroll-row-x absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-[92vw] sm:max-w-[90vw] pb-1 px-2">
          {photos.map((p, i) => {
            const thumbSrc = typeof p === "string" ? p : p.src;
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`shrink-0 w-14 h-9 rounded overflow-hidden border-2 transition-all ${i === idx ? "border-primary scale-110" : "border-transparent opacity-50 hover:opacity-80"}`}
              >
                <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero() {
  const [loaded, setLoaded] = useState(false);
  const { branding } = useBranding();
  const { heroBanners, mediaItems } = useContent();
  const { toggleMyList, isInMyList } = useProfile();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // What's currently open
  const [videoPlayer, setVideoPlayer] = useState<MediaItem | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<MediaItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Carousel auto-advance
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setLoaded(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % heroBanners.length);
        setLoaded(true);
      }, 500);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  const activeBanner = heroBanners[currentIndex];

  // The linked media item for THIS banner
  const linkedItem = activeBanner?.linkedMediaId
    ? mediaItems.find((m) => m.id === activeBanner.linkedMediaId)
    : null;

  // Banner background — skip blob: URLs
  const rawMediaUrl = activeBanner?.mediaUrl ?? "";
  const isBlobUrl = rawMediaUrl.startsWith("blob:");
  const isVideoBackground = activeBanner?.type === "video" && !isBlobUrl && rawMediaUrl !== "";
  const mediaUrl = isBlobUrl || !rawMediaUrl ? heroFallback : getMediaUrl(rawMediaUrl) || heroFallback;

  // Get animation class based on branding setting
  const animationClass = branding.heroAnimation && branding.heroAnimation !== "none"
    ? `motion-safe:animate-[${branding.heroAnimation}_24s_ease-in-out_infinite_alternate]`
    : "";

  // Title / subtitle — from banner, fallback to branding
  const title = activeBanner?.title || branding.heroTagline || "Our Story";
  const subtitle = activeBanner?.subtitle || branding.heroSubtitle || "";
  const titleWords = title.split(" ");
  const mainTitle = titleWords.slice(0, -1).join(" ");
  const lastTitleWord = titleWords.slice(-1)[0] ?? title;

  const inList = linkedItem ? isInMyList(linkedItem.id) : false;

  // ── Play button handler ──────────────────────────────────────────────────
  const handlePlay = () => {
    if (!activeBanner) return;

    // Play the banner's own media (video or photo)
    if (activeBanner.type === "video" && !isBlobUrl && rawMediaUrl) {
      // Banner has a video - create a temporary video player for it
      const tempVideoItem: MediaItem = {
        id: activeBanner.id,
        type: "video",
        title: activeBanner.title,
        year: new Date().getFullYear().toString(),
        tagline: activeBanner.subtitle,
        description: activeBanner.subtitle,
        thumbnail: rawMediaUrl,
        category: "Featured",
        sortRank: 0,
        videoUrl: rawMediaUrl,
        status: "ready",
      };
      setVideoPlayer(tempVideoItem);
    } else if (activeBanner.type === "image" && !isBlobUrl && rawMediaUrl) {
      // Banner has an image - show it in photo lightbox
      const tempPhotoItem: MediaItem = {
        id: activeBanner.id,
        type: "photo",
        title: activeBanner.title,
        year: new Date().getFullYear().toString(),
        tagline: activeBanner.subtitle,
        description: activeBanner.subtitle,
        thumbnail: rawMediaUrl,
        category: "Featured",
        sortRank: 0,
        photos: [{ src: rawMediaUrl, caption: activeBanner.title }],
        status: "ready",
      };
      setPhotoLightbox(tempPhotoItem);
    } else if (linkedItem) {
      // Fallback to linked item if banner media is not available
      if (linkedItem.type === "video" && linkedItem.videoUrl) {
        navigate({ to: "/watch/$mediaId", params: { mediaId: linkedItem.id } });
      } else if (linkedItem.type === "photo" && linkedItem.photos && linkedItem.photos.length > 0) {
        setPhotoLightbox(linkedItem);
      } else if (linkedItem.type === "photo") {
        navigate({ to: "/albums/$albumId", params: { albumId: linkedItem.id } });
      }
    }
  };

  // Play button label changes based on banner's own media type
  const playLabel = activeBanner?.type === "video" ? "Play" : "View Photos";
  const PlayIcon = activeBanner?.type === "video" ? Play : Images;
  const hasPlayTarget = activeBanner && !isBlobUrl && rawMediaUrl;

  return (
    <>
      <section className="relative h-[96vh] sm:h-[90vh] md:h-[96vh] min-h-[500px] sm:min-h-[640px] w-full overflow-hidden bg-black">
        {/* Background Media */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${loaded ? "opacity-100" : "opacity-0"}`}>
          {isVideoBackground ? (
            <video
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ objectFit: 'cover' }}
              className="w-full h-full object-cover scale-105"
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Featured memory"
              width={1920}
              height={1088}
              decoding="async"
              style={{ objectFit: 'cover' }}
              className={`w-full h-full object-cover scale-105 ${animationClass}`}
            />
          )}
        </div>

        {/* Gradients */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 gradient-side" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />

        <div className="relative z-10 h-full flex items-end pb-20 sm:pb-28 md:pb-36 px-4 sm:px-6 lg:px-12">
          <div className="max-w-2xl w-full">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 mb-4 sm:mb-5 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <span className="h-px w-6 sm:w-8 bg-primary" />
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-primary">A Featured Memory</p>
            </div>

            {/* Title */}
            <h1
              className={`font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-foreground text-shadow-hero leading-[0.95] transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: "120ms" }}
            >
              {mainTitle && <>{mainTitle}<br /></>}
              <span className="text-primary italic">{lastTitleWord}</span>
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p
                className={`mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-foreground/80 max-w-xl text-shadow-hero leading-relaxed transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: "240ms" }}
              >
                {subtitle}
              </p>
            )}

            {/* CTAs */}
            <div
              className={`mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: "360ms" }}
            >
              {/* Play / View Photos button */}
              <button
                onClick={handlePlay}
                disabled={!hasPlayTarget}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 sm:px-7 py-3 sm:py-3.5 rounded-md font-medium hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-[var(--shadow-glow)] disabled:opacity-40 disabled:pointer-events-none text-sm sm:text-base"
              >
                <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 fill-current" /> {playLabel}
              </button>

              {/* More Info */}
              <Link
                to="/featured"
                className="inline-flex items-center justify-center gap-2 bg-foreground/15 backdrop-blur border border-foreground/20 text-foreground px-6 sm:px-7 py-3 sm:py-3.5 rounded-md font-medium hover:bg-foreground/25 hover:scale-[1.03] active:scale-[0.98] transition-all text-sm sm:text-base"
              >
                <Info className="h-4 w-4 sm:h-5 sm:w-5" /> More Info
              </Link>

              {/* My List */}
              {linkedItem && (
                <button
                  onClick={() => toggleMyList(linkedItem.id)}
                  className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 sm:ml-2 text-foreground/70 hover:text-foreground transition-colors group py-2 sm:py-0"
                  aria-label={inList ? "Remove from My List" : "Add to My List"}
                >
                  {inList
                    ? <Check className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
                    : <Plus className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
                  }
                  <span className="text-[10px] sm:text-[10px] uppercase tracking-wider">{inList ? "Added" : "My List"}</span>
                </button>
              )}
            </div>

            {/* Meta — from the linked item */}
            {linkedItem && (
              <div
                className={`mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4 text-[10px] sm:text-xs text-foreground/50 transition-all duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: "480ms" }}
              >
                <span className="border border-foreground/30 px-2 py-0.5 rounded text-foreground/60">
                  {linkedItem.year}
                </span>
                <span>{linkedItem.category}</span>
                {linkedItem.type === "photo" && linkedItem.photos && (
                  <>
                    <span>·</span>
                    <span>{linkedItem.photos.length} photos</span>
                  </>
                )}
                {linkedItem.type === "video" && linkedItem.duration && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(linkedItem.duration)}</span>
                  </>
                )}
              </div>
            )}

            {/* Carousel indicators */}
            {heroBanners.length > 1 && (
              <div
                className={`mt-6 sm:mt-8 flex gap-2 transition-all duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: "500ms" }}
              >
                {heroBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setLoaded(false);
                      setTimeout(() => { setCurrentIndex(i); setLoaded(true); }, 500);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-6 bg-primary" : "w-2 bg-white/30 hover:bg-white/50"}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-foreground/40 motion-safe:animate-bounce" aria-hidden="true">
          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </section>

      {/* ── Full-screen video player ── */}
      {videoPlayer && videoPlayer.videoUrl && (
        <VideoPlayer
          key={videoPlayer.id} // Force remount when video changes
          mediaId={videoPlayer.id}
          src={videoPlayer.videoUrl}
          title={videoPlayer.title}
          collectionName={videoPlayer.category}
          onClose={() => setVideoPlayer(null)}
          onPlayNext={(nextId) => {
            const next = mediaItems.find((m) => m.id === nextId);
            if (next?.type === "video") setVideoPlayer(next);
          }}
        />
      )}

      {/* ── Inline photo lightbox ── */}
      {photoLightbox && (
        <PhotoLightbox
          item={photoLightbox}
          onClose={() => setPhotoLightbox(null)}
        />
      )}
    </>
  );
}
