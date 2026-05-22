/**
 * Mood Board — Pinterest-style masonry grid of aesthetic photos.
 * No titles, just vibes. Tap to expand in a lightbox.
 */
import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { getMediaUrl } from "@/lib/api";

interface MoodPhoto {
  id: string;
  imageUrl: string;
  alt: string;
  sortRank: number;
}

// Lightbox
function MoodLightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: MoodPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
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

  const photo = photos[idx];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/96 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white/10 border border-white/20 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-white/40">
        {idx + 1} / {photos.length}
      </span>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 md:left-8 z-10 bg-black/50 border border-white/20 rounded-full p-3 text-white/80 hover:text-white hover:border-white/50 transition-all"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-5xl max-h-[90vh] mx-20 md:mx-28"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={idx}
          src={getMediaUrl(photo.imageUrl)}
          alt={photo.alt || "A moment"}
          className="max-h-[90vh] max-w-full object-contain rounded-xl shadow-[0_40px_80px_-20px_oklch(0_0_0/0.9)] animate-in zoom-in-95 duration-200"
        />
      </div>

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 md:right-8 z-10 bg-black/50 border border-white/20 rounded-full p-3 text-white/80 hover:text-white hover:border-white/50 transition-all"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

// Masonry column layout — split photos into 3 columns
function splitIntoColumns<T>(items: T[], cols: number): T[][] {
  const columns: T[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push(item));
  return columns;
}

export function MoodBoard() {
  const [photos, setPhotos] = useState<MoodPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchApiJson<MoodPhoto[]>("/mood-board")
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && photos.length === 0) return null;

  const columns = splitIntoColumns(photos, 3);

  return (
    <section className="relative py-24 px-6 lg:px-12 overflow-hidden">
      {/* Subtle background */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% 50%, oklch(0.15 0.04 280 / 0.3) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary">aesthetic</p>
            <span className="h-px w-8 bg-primary" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl">
            Our <span className="text-primary italic">Vibe</span>
          </h2>
          <p className="text-muted-foreground mt-4">
            No captions needed. Just us.
          </p>
        </div>

        {/* Masonry grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`rounded-xl bg-card/40 border border-border/40 animate-pulse ${
                  i % 3 === 0 ? "aspect-[3/4]" : i % 2 === 0 ? "aspect-square" : "aspect-[4/3]"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-3">
                {col.map((photo) => {
                  const globalIndex = photos.findIndex((p) => p.id === photo.id);
                  return (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxIndex(globalIndex)}
                      className="group relative overflow-hidden rounded-xl border border-border/30 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={photo.alt || "View photo"}
                    >
                      <img
                        src={getMediaUrl(photo.imageUrl)}
                        alt={photo.alt || ""}
                        className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <MoodLightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
