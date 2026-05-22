import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Tag, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { mediaItems as staticMediaItems, type MediaItem } from "@/data/media";

export const Route = createFileRoute("/albums/$albumId")({
  component: AlbumDetail,
  loader: async ({ params }) => {
    // Try to fetch from API first
    try {
      const response = await fetch(`/api/media/${params.albumId}`, { credentials: "include" });
      if (response.ok) {
        const item: MediaItem = await response.json();
        if (item.type === "photo" && item.photos && item.photos.length > 0) {
          return { album: item };
        }
      }
    } catch (error) {
      console.error("Failed to fetch media item:", error);
    }

    // Fallback to static data
    const item = staticMediaItems.find((m) => m.id === params.albumId);
    if (!item || item.type !== "photo" || !item.photos || item.photos.length === 0) throw notFound();
    return { album: item };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.album.title} — USFLIX` },
          { name: "description", content: loaderData.album.tagline },
          { property: "og:title", content: loaderData.album.title },
          { property: "og:description", content: loaderData.album.tagline },
          { property: "og:image", content: loaderData.album.thumbnail || "" },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="pt-32 text-center">
      <p className="font-display text-2xl">Album not found</p>
      <Link to="/albums" className="text-primary underline mt-4 inline-block">
        Back to albums
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="pt-32 text-center">
      <p>{error.message}</p>
    </div>
  ),
});

function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: { src: string; caption: string }[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % photos.length), [photos.length]);

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

  const photo = photos[current];

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 bg-card/80 border border-border/60 rounded-full p-2 text-foreground/80 hover:text-primary transition-colors"
        aria-label="Close lightbox"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-muted-foreground bg-card/60 border border-border/40 rounded-full px-4 py-1.5 backdrop-blur">
        {current + 1} / {photos.length}
      </div>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 md:left-8 bg-card/80 border border-border/60 rounded-full p-3 text-foreground/80 hover:text-primary hover:border-primary/50 transition-all"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-5xl max-h-[80vh] mx-12 sm:mx-16 md:mx-24 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={current}
          src={photo.src}
          alt={photo.caption}
          className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-[0_40px_80px_-20px_oklch(0_0_0/0.8)] animate-in zoom-in-95 duration-200"
        />
        {photo.caption && (
          <p className="font-display italic text-foreground/80 text-center text-lg animate-in fade-in duration-300">
            {photo.caption}
          </p>
        )}
      </div>

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 md:right-8 bg-card/80 border border-border/60 rounded-full p-3 text-foreground/80 hover:text-primary hover:border-primary/50 transition-all"
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Thumbnail strip — scrollable so it doesn't overflow on albums with many photos */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-[92vw] overflow-x-auto scrollbar-hide px-2 pb-1">
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`shrink-0 w-12 h-8 rounded overflow-hidden border-2 transition-all ${i === current ? "border-primary scale-110" : "border-transparent opacity-50 hover:opacity-80"}`}
            >
              <img src={p.src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumDetail() {
  const { album } = Route.useLoaderData();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);

  // Fetch all media for related albums
  useEffect(() => {
    fetch("/api/media", { credentials: "include" })
      .then((r) => r.json())
      .then((data: MediaItem[]) => setAllMedia(data))
      .catch(() => setAllMedia(staticMediaItems));
  }, []);

  const related = allMedia.filter((a) => a.id !== album.id && a.category === album.category && a.type === "photo").slice(0, 4);
  const fallbackRelated = allMedia.filter((a) => a.id !== album.id && a.type === "photo").slice(0, 4);
  const relatedAlbums = related.length >= 2 ? related : fallbackRelated;

  const coverPhoto = album.photos?.[0];
  const coverSrc = typeof coverPhoto === "string" ? coverPhoto : coverPhoto?.src || album.thumbnail || "";

  return (
    <article>
      {/* Hero */}
      <section className="relative h-[75vh] min-h-[520px] overflow-hidden">
        <img
          src={coverSrc}
          alt={album.title}
          className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-[10s] hover:scale-100"
        />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 gradient-side" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />

        <div className="relative z-10 h-full flex items-end pb-16 px-6 lg:px-12">
          <div className="max-w-2xl">
            <Link
              to="/albums"
              className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-primary mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> All Albums
            </Link>
            <p className="text-xs uppercase tracking-[0.4em] text-primary mb-3">{album.category}</p>
            <h1 className="font-display text-5xl md:text-7xl text-shadow-hero leading-[0.95]">
              {album.title}
            </h1>
            <p className="mt-5 text-lg text-foreground/85 italic font-display">{album.tagline}</p>
            <div className="mt-5 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> {album.year}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" /> {album.photos?.length || 0} photos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="px-6 lg:px-12 max-w-[1400px] mx-auto pt-16 pb-4">
        <p className="text-lg md:text-xl text-foreground/80 max-w-3xl leading-relaxed">{album.description}</p>
      </section>

      {/* Photo grid */}
      <section className="px-6 lg:px-12 max-w-[1400px] mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {album.photos?.map((p: string | { src: string; caption: string }, i: number) => {
            const src = typeof p === "string" ? p : p.src;
            const caption = typeof p === "string" ? album.title : p.caption;
            return (
              <figure
                key={i}
                className={`group cursor-pointer ${i % 3 === 0 ? "md:col-span-2" : ""}`}
                onClick={() => setLightboxIndex(i)}
              >
                <div className="overflow-hidden rounded-xl shadow-[var(--shadow-card)] relative">
                  <img
                    src={src}
                    alt={caption}
                    loading="lazy"
                    className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i % 3 === 0 ? "aspect-[21/9]" : "aspect-[4/3]"}`}
                  />
                  {/* Zoom overlay */}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/70 backdrop-blur rounded-full p-3">
                      <ZoomIn className="h-6 w-6 text-foreground" />
                    </div>
                  </div>
                </div>
                <figcaption className="mt-3 font-display italic text-foreground/70 text-sm">
                  {caption}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* Related albums */}
      <section className="px-6 lg:px-12 max-w-[1600px] mx-auto pb-24">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-3xl">More Memories</h2>
          <Link to="/albums" className="text-sm text-primary hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {relatedAlbums.map((a) => {
            const aCover = a.photos?.[0];
            const aCoverSrc = typeof aCover === "string" ? aCover : aCover?.src || a.thumbnail || "";
            return (
              <Link
                key={a.id}
                to="/albums/$albumId"
                params={{ albumId: a.id }}
                className="group relative aspect-[2/3] overflow-hidden rounded-lg shadow-[var(--shadow-card)] hover:scale-[1.04] hover:z-10 transition-all duration-300"
              >
                <img
                  src={aCoverSrc}
                  alt={a.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-0.5">{a.category}</p>
                  <h3 className="font-display text-lg leading-tight">{a.title}</h3>
                </div>
                <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-1 ring-primary/30 transition-all pointer-events-none" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && album.photos && (
        <Lightbox
          photos={album.photos.map((p) => typeof p === "string" ? { src: p, caption: album.title } : p)}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </article>
  );
}
