/**
 * Our Bucket List — A checklist of things you want to do together.
 * Items can be checked off with a confetti animation.
 * Unchecked items show as dreams, checked ones show as memories.
 */
import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { useHeartRainfall } from "@/context/heartRainfall";
import confetti from "canvas-confetti";

interface BucketListItem {
  id: string;
  item: string;
  emoji: string;
  completed: boolean;
  completedAt: string | null;
  sortRank: number;
}

export function OurBucketList() {
  const [items, setItems] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { triggerHeartBurst } = useHeartRainfall();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await fetchApiJson<BucketListItem[]>("/bucket-list");
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch bucket list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleToggle = async (id: string, e: React.MouseEvent) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? new Date().toISOString() : null } : i
      )
    );

    // Confetti animation when completing
    if (!item.completed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        },
        colors: ["#e50914", "#ff6b9d", "#ffd700", "#ff1493"],
      });
      triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY });
    }

    // Sync with backend (no auth required for public toggle)
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/bucket-list/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to toggle bucket list item:", error);
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === id ? item : i))
      );
    }
  };

  if (loading) {
    return (
      <section className="relative py-20 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto mb-8" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  const dreams = items.filter((i) => !i.completed);
  const memories = items.filter((i) => i.completed);
  const progress = items.length > 0 ? Math.round((memories.length / items.length) * 100) : 0;

  return (
    <section className="relative py-20 px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, oklch(0.15 0.05 45 / 0.3) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary/80">Our Adventures</p>
            <span className="h-px w-8 bg-primary/60" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl mb-3">
            Our <span className="text-primary italic">Bucket List</span>
          </h2>
          <p className="text-muted-foreground mb-6">
            Dreams we're chasing together, one adventure at a time.
          </p>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>{memories.length} completed</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dreams (unchecked) */}
        {dreams.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display text-2xl">Dreams</h3>
              <span className="text-sm text-muted-foreground">({dreams.length})</span>
            </div>
            <div className="space-y-3">
              {dreams.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => handleToggle(item.id, e)}
                  className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl border border-border/60 bg-card/30 hover:bg-card/50 hover:border-primary/50 transition-all duration-200 text-left"
                >
                  <Circle className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xl mr-2 shrink-0">{item.emoji}</span>
                  <span className="flex-1 text-lg">{item.item}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Memories (checked) */}
        {memories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-display text-2xl">Memories</h3>
              <span className="text-sm text-muted-foreground">({memories.length})</span>
            </div>
            <div className="space-y-3">
              {memories.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => handleToggle(item.id, e)}
                  className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-all duration-200 text-left"
                >
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                  <span className="text-xl mr-2 shrink-0 opacity-60">{item.emoji}</span>
                  <span className="flex-1 text-lg line-through opacity-60">{item.item}</span>
                  {item.completedAt && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(item.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
