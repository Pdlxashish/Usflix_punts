/**
 * Random Memory — a "Surprise Me" button that picks a random photo/video
 * from the collection and displays it like a memory slot machine.
 */
import { useState, useCallback, useRef } from "react";
import { Shuffle, Play, X, ChevronRight } from "lucide-react";
import { getMediaUrl } from "@/lib/api";
import { useHeartRainfall } from "@/context/heartRainfall";

interface MediaItem {
  id: string;
  type: "photo" | "video" | "voice";
  title: string;
  tagline: string;
  thumbnail: string;
  videoUrl?: string;
  photos?: string[];
  category: string;
  status: string;
}

interface RandomMemoryProps {
  mediaItems: MediaItem[];
  onPlay?: (item: MediaItem) => void;
}

// Slot-machine style spinning text
const SPIN_EMOJIS = ["📸", "🎬", "💕", "✨", "🌹", "🎞️", "💫", "🥰"];

export function RandomMemory({ mediaItems, onPlay }: RandomMemoryProps) {
  const [picked, setPicked] = useState<MediaItem | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinEmoji, setSpinEmoji] = useState("🎲");
  const [revealed, setRevealed] = useState(false);
  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { triggerHeartBurst } = useHeartRainfall();

  const eligible = mediaItems.filter(
    (m) => m.status === "ready" && (m.type === "photo" || m.type === "video")
  );

  const spin = useCallback(
    async (e: React.MouseEvent) => {
      if (spinning || eligible.length === 0) return;
      setSpinning(true);
      setRevealed(false);
      setPicked(null);

      // Slot-machine spin animation
      let tick = 0;
      spinInterval.current = setInterval(() => {
        setSpinEmoji(SPIN_EMOJIS[tick % SPIN_EMOJIS.length]);
        tick++;
      }, 80);

      await new Promise((r) => setTimeout(r, 1200));

      if (spinInterval.current) clearInterval(spinInterval.current);

      const random = eligible[Math.floor(Math.random() * eligible.length)];
      setPicked(random);
      setSpinEmoji("✨");
      setSpinning(false);

      // Small delay then reveal
      await new Promise((r) => setTimeout(r, 100));
      setRevealed(true);
      triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY });
    },
    [spinning, eligible, triggerHeartBurst]
  );

  const dismiss = () => {
    setRevealed(false);
    setTimeout(() => setPicked(null), 400);
  };

  if (eligible.length === 0) return null;

  const thumbSrc = picked
    ? picked.thumbnail
      ? getMediaUrl(picked.thumbnail)
      : picked.photos?.[0]
        ? getMediaUrl(picked.photos[0])
        : null
    : null;

  return (
    <section className="relative py-20 px-6 lg:px-12 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, oklch(0.15 0.05 22 / 0.4) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto text-center">
        {/* Heading */}
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="h-px w-8 bg-primary/60" />
          <p className="text-xs uppercase tracking-[0.4em] text-primary/80">Memory Machine</p>
          <span className="h-px w-8 bg-primary/60" />
        </div>
        <h2 className="font-display text-5xl md:text-6xl mb-3">
          Surprise <span className="text-primary italic">Me</span>
        </h2>
        <p className="text-muted-foreground mb-10">
          Hit the button and we'll pull a random memory from our collection.
        </p>

        {/* Big button */}
        <button
          onClick={spin}
          disabled={spinning}
          aria-label="Pick a random memory"
          className={`group relative inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-2xl text-lg font-semibold shadow-[var(--shadow-glow)] transition-all duration-200 ${
            spinning
              ? "scale-95 opacity-80 cursor-wait"
              : "hover:scale-105 hover:shadow-[0_0_40px_oklch(0.5_0.2_22/0.5)] active:scale-95"
          }`}
        >
          <span
            className={`text-2xl transition-transform duration-100 ${spinning ? "animate-spin" : "group-hover:rotate-180"}`}
            style={{ display: "inline-block" }}
          >
            {spinning ? spinEmoji : <Shuffle className="h-6 w-6" />}
          </span>
          {spinning ? "Finding a memory…" : "Surprise Me"}
        </button>

        <p className="text-xs text-muted-foreground mt-3">
          {eligible.length} memories in the collection
        </p>

        {/* Revealed memory card */}
        {picked && (
          <div
            className={`mt-10 transition-all duration-500 ${
              revealed ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
            }`}
          >
            <div className="relative mx-auto max-w-sm rounded-2xl overflow-hidden border border-primary/30 shadow-[var(--shadow-glow)] bg-card/80 backdrop-blur">
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 z-10 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Thumbnail */}
              {thumbSrc ? (
                <div className="relative aspect-video bg-muted">
                  <img
                    src={thumbSrc}
                    alt={picked.title}
                    className="w-full h-full object-cover"
                  />
                  {picked.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                        <Play className="h-6 w-6 text-white fill-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted/50 flex items-center justify-center">
                  <span className="text-5xl">📸</span>
                </div>
              )}

              {/* Info */}
              <div className="px-5 py-4 text-left">
                <p className="text-xs text-primary uppercase tracking-widest mb-1">{picked.category}</p>
                <h3 className="font-display text-xl mb-1">{picked.title}</h3>
                {picked.tagline && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{picked.tagline}</p>
                )}

                {picked.type === "video" && onPlay && (
                  <button
                    onClick={() => { onPlay(picked); dismiss(); }}
                    className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-full justify-center"
                  >
                    <Play className="h-4 w-4 fill-current" /> Watch this memory
                  </button>
                )}
              </div>
            </div>

            {/* Spin again */}
            <button
              onClick={spin as any}
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" /> Another one
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
