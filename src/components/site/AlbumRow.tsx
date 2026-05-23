import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { Album } from "@/data/albums";
import { getMediaUrl } from "@/lib/api";

export function AlbumRow({ title, items }: { title: string; items: Album[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.75, behavior: "smooth" });
  };

  return (
    <section className="relative group/row py-5">
      {/* Row header */}
      <div className="px-6 lg:px-12 mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl md:text-3xl text-foreground group-hover/row:text-primary transition-colors duration-300">
          {title}
        </h2>
        <Link
          to="/albums"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 opacity-0 group-hover/row:opacity-100 duration-300"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="relative">
        {/* Left scroll button */}
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-14 lg:w-16 items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:from-background/90"
        >
          <div className="bg-background/80 border border-border/60 rounded-full p-1.5 shadow-lg">
            <ChevronLeft className="h-5 w-5" />
          </div>
        </button>

        {/* Cards container */}
        <div
          ref={ref}
          className="scroll-row-x flex gap-2 sm:gap-3 snap-x snap-mandatory px-4 sm:px-6 lg:px-12 pb-2"
        >
          {items.map((a) => (
            <Link
              key={a.id}
              to="/albums/$albumId"
              params={{ albumId: a.id }}
              onMouseEnter={() => setHoveredId(a.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="snap-start shrink-0 w-[42vw] max-w-[168px] sm:w-[200px] sm:max-w-none md:w-[260px] lg:w-[290px] aspect-[2/3] rounded-lg overflow-hidden relative group/card shadow-[var(--shadow-card)] transition-all duration-300 sm:hover:scale-[1.05] sm:hover:z-10 sm:hover:shadow-[0_30px_60px_-10px_oklch(0_0_0/0.8)] touch-manipulation"
            >
              {/* Cover image */}
              <img
                src={getMediaUrl(a.cover)}
                alt={a.title}
                loading="lazy"
                width="290"
                height="435"
                decoding="async"
                style={{ objectFit: 'cover' }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                onError={(e) => {
                  console.error('Failed to load album cover:', a.cover);
                  e.currentTarget.style.display = 'none';
                }}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80 group-hover/card:opacity-100 transition-opacity duration-300" />

              {/* Play button on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                <div className="bg-primary/90 rounded-full p-3 shadow-[var(--shadow-glow)] scale-75 group-hover/card:scale-100 transition-transform duration-300">
                  <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
                </div>
              </div>

              {/* Card info */}
              <div className="absolute inset-x-0 bottom-0 p-4 translate-y-1 group-hover/card:translate-y-0 transition-transform duration-300">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
                  {a.category} · {a.year}
                </p>
                <h3 className="font-display text-lg text-foreground leading-tight">{a.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 leading-relaxed">
                  {a.tagline}
                </p>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                  <span className="text-[10px] border border-foreground/30 px-1.5 py-0.5 rounded text-foreground/60">
                    {a.photos.length} photos
                  </span>
                </div>
              </div>

              {/* Hover border glow */}
              {hoveredId === a.id && (
                <div className="absolute inset-0 rounded-lg ring-1 ring-primary/40 pointer-events-none" />
              )}
            </Link>
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 w-14 lg:w-16 items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:from-background/90"
        >
          <div className="bg-background/80 border border-border/60 rounded-full p-1.5 shadow-lg">
            <ChevronRight className="h-5 w-5" />
          </div>
        </button>
      </div>
    </section>
  );
}
