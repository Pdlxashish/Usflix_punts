/**
 * Our Bucket List — checklist of things to do together.
 * Unchecked = dreams. Checked = memories. Confetti on completion.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Check, Star } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { api } from "@/lib/api";

interface BucketItem {
  id: string;
  item: string;
  emoji: string;
  completed: boolean;
  completedAt: string | null;
  sortRank: number;
}

// Tiny confetti burst — pure CSS/DOM, no library needed
function spawnConfetti(container: HTMLElement) {
  const colors = ["#e50914", "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#c77dff"];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement("span");
    el.style.cssText = `
      position:absolute;
      width:${6 + Math.random() * 6}px;
      height:${6 + Math.random() * 6}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      left:${30 + Math.random() * 40}%;
      top:50%;
      pointer-events:none;
      z-index:50;
      animation:confetti-fly ${0.8 + Math.random() * 0.6}s ease-out forwards;
      --dx:${(Math.random() - 0.5) * 120}px;
      --dy:${-(40 + Math.random() * 80)}px;
      --rot:${Math.random() * 720}deg;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

export function BucketList() {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchApiJson<BucketItem[]>("/bucket-list");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (item: BucketItem) => {
    if (toggling) return;
    setToggling(item.id);
    try {
      const updated = await api.patch<{ ok: boolean; item: BucketItem }>(`/bucket-list/${item.id}/toggle`);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
      // Confetti only when completing (not un-completing)
      if (!item.completed && containerRef.current) {
        spawnConfetti(containerRef.current);
      }
    } catch {
      // silently fail — read-only visitors can't toggle anyway
    } finally {
      setToggling(null);
    }
  };

  if (!loading && items.length === 0) return null;

  const dreams = items.filter((i) => !i.completed);
  const memories = items.filter((i) => i.completed);

  return (
    <section className="relative py-24 px-6 lg:px-12 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, oklch(0.18 0.06 150 / 0.3) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary/80">
              {memories.length} done · {dreams.length} to go
            </p>
            <span className="h-px w-8 bg-primary/60" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl">
            Our Bucket <span className="text-primary italic">List</span>
          </h2>
          <p className="text-muted-foreground mt-4">
            Dreams become memories, one adventure at a time.
          </p>
        </div>

        {/* Confetti container */}
        <div ref={containerRef} className="relative">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-card/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Dreams — unchecked */}
              {dreams.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
                    <Star className="h-3 w-3" /> Dreams
                  </h3>
                  <div className="space-y-2">
                    {dreams.map((item) => (
                      <BucketRow
                        key={item.id}
                        item={item}
                        onToggle={toggle}
                        toggling={toggling === item.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Memories — checked */}
              {memories.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
                    <Check className="h-3 w-3" /> Memories
                  </h3>
                  <div className="space-y-2">
                    {memories.map((item) => (
                      <BucketRow
                        key={item.id}
                        item={item}
                        onToggle={toggle}
                        toggling={toggling === item.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confetti keyframe */}
      <style>{`
        @keyframes confetti-fly {
          0%   { transform: translate(0,0) rotate(0deg); opacity:1; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity:0; }
        }
      `}</style>
    </section>
  );
}

function BucketRow({
  item,
  onToggle,
  toggling,
}: {
  item: BucketItem;
  onToggle: (item: BucketItem) => void;
  toggling: boolean;
}) {
  return (
    <button
      onClick={() => onToggle(item)}
      disabled={toggling}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300 text-left group ${
        item.completed
          ? "bg-primary/8 border-primary/25 opacity-75"
          : "bg-card/50 border-border/60 hover:border-primary/40 hover:bg-card/80"
      }`}
      aria-label={`${item.completed ? "Uncheck" : "Check"}: ${item.item}`}
    >
      {/* Checkbox */}
      <span
        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
          item.completed
            ? "bg-primary border-primary"
            : "border-border/60 group-hover:border-primary/60"
        }`}
      >
        {item.completed && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
      </span>

      {/* Emoji */}
      <span className="text-xl shrink-0">{item.emoji}</span>

      {/* Text */}
      <span
        className={`flex-1 text-sm font-medium transition-all duration-300 ${
          item.completed ? "line-through text-muted-foreground" : "text-foreground"
        }`}
      >
        {item.item}
      </span>

      {/* Completed date */}
      {item.completed && item.completedAt && (
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(item.completedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      )}
    </button>
  );
}
