/**
 * Mood of the Day — A small widget where you can set a daily mood/emoji + a short message.
 * Updates every day. Shows the current day's mood on the home page.
 */
import { useState, useEffect } from "react";
import { Heart, Calendar } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";

interface MoodOfDay {
  id: string;
  moodDate: string;
  emoji: string;
  message: string;
  createdAt: string;
}

export function MoodOfTheDay() {
  const [mood, setMood] = useState<MoodOfDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchMood = async () => {
      try {
        const data = await fetchApiJson<MoodOfDay>("/mood-of-day/today");
        setMood(data);
        setNotFound(false);
      } catch (error: any) {
        console.error("Failed to fetch mood of the day:", error);
        if (error?.message?.includes("404") || error?.message?.includes("No mood")) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMood();
  }, []);

  if (loading) {
    return (
      <section className="relative py-12 px-6 lg:px-12">
        <div className="max-w-2xl mx-auto">
          <div className="h-32 bg-muted animate-pulse rounded-2xl" />
        </div>
      </section>
    );
  }

  if (notFound || !mood) return null;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, oklch(0.15 0.05 330 / 0.25) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto">
        <div className="relative bg-gradient-to-br from-primary/10 via-pink-500/10 to-purple-500/10 backdrop-blur border border-primary/30 rounded-3xl p-8 shadow-[var(--shadow-glow)]">
          {/* Decorative hearts */}
          <div className="absolute top-4 right-4 opacity-20">
            <Heart className="h-8 w-8 text-primary fill-primary" />
          </div>

          {/* Date badge */}
          <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur border border-border/60 rounded-full px-4 py-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{today}</span>
          </div>

          {/* Mood content */}
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="text-5xl sm:text-6xl shrink-0 animate-bounce" style={{ animationDuration: "2s" }}>
              {mood.emoji}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl sm:text-2xl mb-2">Today's Mood</h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{mood.message}</p>
            </div>
          </div>

          {/* Decorative gradient line */}
          <div className="mt-6 h-1 w-full rounded-full bg-gradient-to-r from-primary via-pink-500 to-purple-500 opacity-30" />
        </div>
      </div>
    </section>
  );
}
