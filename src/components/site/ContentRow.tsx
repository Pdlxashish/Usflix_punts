/**
 * ContentRow — Netflix-style horizontally scrollable row with arrow navigation.
 * Features: left/right arrow buttons, smooth scroll, hover scale without clipping.
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaCard } from "@/components/site/MediaCard";
import type { MediaItem } from "@/data/media";

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  onPlay?: (item: MediaItem) => void;
  /** When false, only the scroll row is shown (section provides its own heading). */
  showTitle?: boolean;
}

export function ContentRow({ title, items, onPlay, showTitle = true }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [isHoveringRow, setIsHoveringRow] = useState(false);
  const [visibleStart, setVisibleStart] = useState(0);

  // Update arrow visibility based on scroll position
  const updateArrows = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    setVisibleStart(el.scrollLeft);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    updateArrows();
    return () => el.removeEventListener("scroll", updateArrows);
  }, [updateArrows, items]);

  const scrollBy = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section
      className="relative group/row py-4 sm:py-6"
      onMouseEnter={() => setIsHoveringRow(true)}
      onMouseLeave={() => setIsHoveringRow(false)}
    >
      {showTitle && title ? (
        <div className="px-4 sm:px-6 lg:px-16 mb-3 sm:mb-4 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl text-foreground group-hover/row:text-primary transition-colors duration-300 flex items-center gap-2 sm:gap-3">
            {title}
            <ChevronRight
              className={`h-5 w-5 text-primary transition-all duration-300 ${isHoveringRow ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
            />
          </h2>
          <span className="text-xs text-muted-foreground/60">{items.length} {items.length === 1 ? "memory" : "memories"}</span>
        </div>
      ) : null}

      {/* Left Arrow */}
      <button
        onClick={() => scrollBy("left")}
        aria-label="Scroll left"
        className={`absolute left-0 top-1/2 -translate-y-4 z-20 h-full w-14 lg:w-16 flex items-center justify-center
          bg-gradient-to-r from-background/95 to-transparent
          transition-all duration-300
          ${showLeft && isHoveringRow ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="bg-background/80 backdrop-blur border border-border/60 rounded-full p-2 shadow-xl hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-200">
          <ChevronLeft className="h-5 w-5 text-foreground hover:text-primary-foreground" />
        </div>
      </button>

      {/* Scrollable track — overflow-visible so cards can pop up on hover */}
      <div
        ref={rowRef}
        className="scroll-row-x flex gap-2 sm:gap-3 snap-x snap-mandatory px-4 sm:px-6 lg:px-16 pb-6"
      >
        {items.map((item, idx) => (
          <MediaCard
            key={item.id}
            item={item}
            collectionName={title}
            onPlay={onPlay}
            href={item.type === "photo" ? `/albums/${item.id}` : undefined}
            className="animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none"
            style={{ animationDelay: `${Math.min(idx * 60, 400)}ms` }}
          />
        ))}

        {/* End padding spacer */}
        <div className="shrink-0 w-6 lg:w-10" aria-hidden="true" />
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scrollBy("right")}
        aria-label="Scroll right"
        className={`absolute right-0 top-1/2 -translate-y-4 z-20 h-full w-14 lg:w-16 flex items-center justify-center
          bg-gradient-to-l from-background/95 to-transparent
          transition-all duration-300
          ${showRight && isHoveringRow ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="bg-background/80 backdrop-blur border border-border/60 rounded-full p-2 shadow-xl hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-200">
          <ChevronRight className="h-5 w-5 text-foreground hover:text-primary-foreground" />
        </div>
      </button>

      {/* Progress indicator dots */}
      {items.length > 4 && (
        <div className={`flex gap-1 justify-center mt-1 transition-opacity duration-300 ${isHoveringRow ? "opacity-100" : "opacity-0"}`}>
          {Array.from({ length: Math.ceil(items.length / 4) }).map((_, i) => {
            const el = rowRef.current;
            const pageWidth = el ? el.clientWidth : 1;
            const currentPage = Math.round(visibleStart / pageWidth);
            return (
              <div
                key={i}
                className={`h-0.5 rounded-full transition-all duration-300 ${i === currentPage ? "w-5 bg-primary" : "w-2 bg-border/60"}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
