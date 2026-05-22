/**
 * Mood of the Day — a small daily widget showing today's mood emoji + message.
 * Admin sets it each day; visitors see it when they open the site.
 */
import { useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/fetchApi";

interface DayMood {
  id: string;
  moodDate: string;
  emoji: string;
  message: string;
}

export function MoodOfDay() {
  const [mood, setMood] = useState<DayMood | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchApiJson<DayMood>("/mood-of-day/today")
      .then((data) => {
        setMood(data);
        // Slight delay so the entrance animation plays
        setTimeout(() => setVisible(true), 100);
      })
      .catch(() => setMood(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !mood) return null;

  const dateLabel = new Date(mood.moodDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative py-16 px-6 lg:px-12 overflow-hidden">
      {/* Soft background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.18 0.06 280 / 0.35) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-xl mx-auto text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="h-px w-8 bg-primary/60" />
          <p className="text-xs uppercase tracking-[0.4em] text-primary/80">Today's Vibe</p>
          <span className="h-px w-8 bg-primary/60" />
        </div>

        {/* Card */}
        <div
          className={`relative inline-block w-full max-w-sm mx-auto transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="bg-card/70 border border-border/60 rounded-3xl px-8 py-8 shadow-[var(--shadow-card)] backdrop-blur-sm">
            {/* Emoji */}
            <div className="text-7xl mb-4 select-none" role="img" aria-label="Today's mood emoji">
              {mood.emoji}
            </div>

            {/* Message */}
            {mood.message && (
              <p className="font-display italic text-xl text-foreground leading-relaxed mb-4">
                "{mood.message}"
              </p>
            )}

            {/* Date */}
            <p className="text-xs text-muted-foreground tracking-wide">{dateLabel}</p>
          </div>

          {/* Decorative dots */}
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/30 blur-sm" />
          <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-primary/20 blur-sm" />
        </div>
      </div>
    </section>
  );
}
