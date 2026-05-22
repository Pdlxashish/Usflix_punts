/**
 * "First Time We..." — vertical timeline of relationship milestones.
 * Each milestone has an emoji, date, title, story, and optional photo.
 */
import { useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/fetchApi";
import { getMediaUrl } from "@/lib/api";

interface Milestone {
  id: string;
  title: string;
  story: string;
  date: string;
  imageUrl: string;
  emoji: string;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function MilestoneCard({
  milestone,
  index,
  isLast,
}: {
  milestone: Milestone;
  index: number;
  isLast: boolean;
}) {
  const isLeft = index % 2 === 0;

  return (
    <div className="relative flex items-start gap-0">
      {/* ── Left side content (even) ── */}
      <div className={`flex-1 ${isLeft ? "pr-8 text-right" : "pr-8 opacity-0 pointer-events-none"}`}>
        {isLeft && (
          <MilestoneContent milestone={milestone} align="right" />
        )}
      </div>

      {/* ── Center spine ── */}
      <div className="relative flex flex-col items-center shrink-0 w-12">
        {/* Emoji bubble */}
        <div className="relative z-10 w-12 h-12 rounded-full bg-card border-2 border-primary/60 flex items-center justify-center text-xl shadow-[var(--shadow-glow)] shrink-0">
          {milestone.emoji}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent mt-2 min-h-[3rem]" />
        )}
      </div>

      {/* ── Right side content (odd) ── */}
      <div className={`flex-1 ${!isLeft ? "pl-8 text-left" : "pl-8 opacity-0 pointer-events-none"}`}>
        {!isLeft && (
          <MilestoneContent milestone={milestone} align="left" />
        )}
      </div>
    </div>
  );
}

function MilestoneContent({
  milestone,
  align,
}: {
  milestone: Milestone;
  align: "left" | "right";
}) {
  return (
    <div
      className={`group bg-card/60 border border-border/50 rounded-2xl p-5 backdrop-blur hover:border-primary/40 hover:bg-card/80 transition-all duration-300 shadow-[var(--shadow-card)] ${
        align === "right" ? "ml-auto" : "mr-auto"
      } max-w-xs w-full`}
    >
      {/* Date */}
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
        {formatDate(milestone.date)}
      </p>

      {/* Title */}
      <h3 className="font-display text-xl text-foreground leading-tight mb-2">
        {milestone.title}
      </h3>

      {/* Photo */}
      {milestone.imageUrl && (
        <div className="rounded-xl overflow-hidden mb-3 aspect-video">
          <img
            src={getMediaUrl(milestone.imageUrl)}
            alt={milestone.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}

      {/* Story */}
      {milestone.story && (
        <p className="text-sm text-muted-foreground leading-relaxed italic">
          "{milestone.story}"
        </p>
      )}
    </div>
  );
}

// Mobile: simple vertical list (no alternating)
function MilestoneCardMobile({ milestone }: { milestone: Milestone }) {
  return (
    <div className="flex gap-4 items-start">
      {/* Emoji + line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-10 h-10 rounded-full bg-card border-2 border-primary/60 flex items-center justify-center text-lg shadow-[var(--shadow-glow)]">
          {milestone.emoji}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent mt-2 min-h-[2rem]" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
          {formatDate(milestone.date)}
        </p>
        <h3 className="font-display text-xl text-foreground mb-2">{milestone.title}</h3>
        {milestone.imageUrl && (
          <div className="rounded-xl overflow-hidden mb-3 aspect-video max-w-xs">
            <img
              src={getMediaUrl(milestone.imageUrl)}
              alt={milestone.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        {milestone.story && (
          <p className="text-sm text-muted-foreground italic">"{milestone.story}"</p>
        )}
      </div>
    </div>
  );
}

export function OurFirstTimes() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiJson<Milestone[]>("/milestones")
      .then(setMilestones)
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && milestones.length === 0) return null;

  return (
    <section className="relative py-24 px-6 lg:px-12 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.18 0.06 260 / 0.35) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary">our story</p>
            <span className="h-px w-8 bg-primary" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl">
            First Time <span className="text-primary italic">We...</span>
          </h2>
          <p className="text-muted-foreground mt-4">
            Every beginning that became a forever.
          </p>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-card/40 border border-border/40 animate-pulse shrink-0" />
                <div className="flex-1 h-32 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop: alternating timeline */}
            <div className="hidden md:flex flex-col gap-0">
              {milestones.map((m, i) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  index={i}
                  isLast={i === milestones.length - 1}
                />
              ))}
            </div>

            {/* Mobile: simple list */}
            <div className="md:hidden flex flex-col">
              {milestones.map((m) => (
                <MilestoneCardMobile key={m.id} milestone={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
