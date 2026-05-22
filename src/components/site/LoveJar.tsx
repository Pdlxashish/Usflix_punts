/**
 * Love Jar — shake/click the jar to reveal a random reason you love her.
 * Animated jar with floating hearts, paper slip reveal.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Heart, RefreshCw } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { useHeartRainfall } from "@/context/heartRainfall";

interface JarReason {
  id: string;
  reason: string;
  emoji: string;
}

// Floating heart particle
function FloatingHeart({ style }: { style: React.CSSProperties }) {
  return (
    <span
      className="absolute pointer-events-none select-none text-primary animate-[float-up_1.8s_ease-out_forwards]"
      style={style}
      aria-hidden="true"
    >
      ♥
    </span>
  );
}

export function LoveJar() {
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState<JarReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; style: React.CSSProperties }[]>([]);
  const heartCounter = useRef(0);
  const { triggerHeartBurst } = useHeartRainfall();

  // Load total count on mount
  useEffect(() => {
    fetchApiJson<JarReason[]>("/love-jar")
      .then((data) => setTotal(data.length))
      .catch(() => setTotal(0))
      .finally(() => setLoading(false));
  }, []);

  const spawnHearts = useCallback(() => {
    const newHearts = Array.from({ length: 6 }, (_, i) => ({
      id: ++heartCounter.current,
      style: {
        left: `${20 + Math.random() * 60}%`,
        bottom: "60%",
        fontSize: `${12 + Math.random() * 14}px`,
        animationDelay: `${i * 0.1}s`,
        opacity: 0.8 + Math.random() * 0.2,
      } as React.CSSProperties,
    }));
    setHearts((h) => [...h, ...newHearts]);
    setTimeout(() => {
      setHearts((h) => h.filter((x) => !newHearts.find((n) => n.id === x.id)));
    }, 2000);
  }, []);

  const shake = useCallback(
    async (e: React.MouseEvent) => {
      if (shaking) return;
      setShaking(true);
      setRevealing(false);
      setCurrent(null);
      spawnHearts();

      // Shake animation duration
      await new Promise((r) => setTimeout(r, 600));

      try {
        const reason = await fetchApiJson<JarReason>("/love-jar/random");
        setCurrent(reason);
        setRevealing(true);
        triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY });
      } catch {
        // no reasons yet
      }

      setShaking(false);
    },
    [shaking, spawnHearts, triggerHeartBurst]
  );

  if (!loading && total === 0) return null;

  return (
    <section className="relative py-14 md:py-24 px-6 lg:px-12 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 60%, oklch(0.2 0.07 22 / 0.5) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto text-center">
        {/* Heading */}
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="h-px w-8 bg-primary" />
          <p className="text-xs uppercase tracking-[0.4em] text-primary">
            {total} reasons
          </p>
          <span className="h-px w-8 bg-primary" />
        </div>
        <h2 className="font-display text-5xl md:text-6xl">
          Why I Love <span className="text-primary italic">You</span>
        </h2>
        <p className="text-muted-foreground mt-4 mb-10">
          Shake the jar to pull out a reason. There are {total} of them.
        </p>

        {/* Jar + hearts container */}
        <div className="relative inline-block">
          {/* Floating hearts */}
          {hearts.map((h) => (
            <FloatingHeart key={h.id} style={h.style} />
          ))}

          {/* Jar button */}
          <button
            onClick={shake}
            disabled={shaking || loading}
            aria-label="Shake the love jar"
            className={`relative group transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full ${
              shaking ? "animate-[shake_0.5s_ease-in-out]" : "hover:scale-105 active:scale-95"
            }`}
          >
            {/* Jar SVG */}
            <svg
              viewBox="0 0 120 160"
              className="w-36 h-48 drop-shadow-[0_8px_24px_oklch(0.5_0.2_22/0.4)]"
              aria-hidden="true"
            >
              {/* Jar body */}
              <rect x="15" y="40" width="90" height="110" rx="18" ry="18"
                fill="oklch(0.18 0.04 22 / 0.85)" stroke="oklch(0.6 0.15 22 / 0.6)" strokeWidth="2" />
              {/* Glass shine */}
              <rect x="22" y="50" width="12" height="60" rx="6"
                fill="white" opacity="0.08" />
              {/* Lid */}
              <rect x="10" y="26" width="100" height="20" rx="8"
                fill="oklch(0.25 0.08 22 / 0.9)" stroke="oklch(0.6 0.15 22 / 0.5)" strokeWidth="1.5" />
              {/* Hearts inside jar */}
              <text x="38" y="90" fontSize="18" opacity="0.7">💕</text>
              <text x="62" y="115" fontSize="14" opacity="0.5">♥</text>
              <text x="30" y="120" fontSize="12" opacity="0.4">♥</text>
              <text x="72" y="88" fontSize="10" opacity="0.3">♥</text>
              {/* Label */}
              <rect x="28" y="98" width="64" height="28" rx="6"
                fill="oklch(0.3 0.1 22 / 0.6)" />
              <text x="60" y="117" textAnchor="middle" fontSize="9"
                fill="oklch(0.85 0.1 22)" fontFamily="serif" fontStyle="italic">
                reasons
              </text>
            </svg>

            {/* Shake hint */}
            {!shaking && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                shake me ✨
              </span>
            )}
          </button>
        </div>

        {/* Revealed reason slip */}
        <div
          className={`mt-10 transition-all duration-500 ${
            revealing && current
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {current && (
            <div className="relative mx-auto max-w-sm">
              {/* Paper slip */}
              <div className="bg-card/80 border border-primary/30 rounded-2xl px-8 py-6 shadow-[var(--shadow-glow)] backdrop-blur">
                <span className="text-3xl block mb-3">{current.emoji}</span>
                <p className="font-display italic text-xl text-foreground leading-relaxed">
                  "{current.reason}"
                </p>
                <Heart className="h-4 w-4 fill-primary text-primary mx-auto mt-4" />
              </div>

              {/* Get another */}
              <button
                onClick={shake as any}
                className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Another reason
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyframe styles — defined in styles.css */}
    </section>
  );
}
