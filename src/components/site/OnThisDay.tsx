/**
 * Memories from this calendar day in past years.
 */
import { useMemo } from "react";
import { CalendarDays, Clock } from "lucide-react";
import type { MediaItem } from "@/data/media";
import { ContentRow } from "@/components/site/ContentRow";
import { formatOnThisDayHeading, getOnThisDayMemories } from "@/lib/onThisDay";

interface OnThisDayProps {
  mediaItems: MediaItem[];
  onPlay?: (item: MediaItem) => void;
}

export function OnThisDay({ mediaItems, onPlay }: OnThisDayProps) {
  const matches = useMemo(() => getOnThisDayMemories(mediaItems), [mediaItems]);
  const items = useMemo(() => matches.map((m) => m.item), [matches]);
  const heading = formatOnThisDayHeading();

  if (items.length === 0) return null;

  const yearLabels = matches
    .map((m) => m.yearsAgo)
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => b - a);

  return (
    <section className="relative mb-6 sm:mb-8 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-60"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, oklch(0.18 0.05 22 / 0.35) 50%, transparent 100%)",
        }}
      />
      <div className="px-4 sm:px-6 lg:px-12 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-primary mb-2 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              On This Day
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl">{heading}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {items.length} memor{items.length === 1 ? "y" : "ies"} from{" "}
              {yearLabels.length === 1
                ? `${yearLabels[0]} year${yearLabels[0] === 1 ? "" : "s"} ago`
                : "years past"}
              — relive what made this date special.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5 shrink-0">
            <Clock className="h-3.5 w-3.5" />
            Based on when each memory was added
          </p>
        </div>
      </div>
      <ContentRow title="" items={items} onPlay={onPlay} showTitle={false} />
    </section>
  );
}
