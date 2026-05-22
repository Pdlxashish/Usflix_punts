import { Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHeartRainfall } from "@/context/heartRainfall";
import {
  HEART_LOVE_BOMB_CLICKS,
  HEART_LOVE_BOMB_CLICK_RESET_MS,
  HEART_LOVE_BOMB_DETONATE_MS,
} from "@/components/effects/heartRainfallConstants";

type Phase = "idle" | "charging" | "detonating" | "cooldown";

const FRAGMENT_COUNT = 14;

export function LoveBombHeart() {
  const { triggerLoveBomb } = useHeartRainfall();
  const [clickCount, setClickCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detonateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const clearResetTimer = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const scheduleClickReset = useCallback(() => {
    clearResetTimer();
    resetTimerRef.current = setTimeout(() => {
      setClickCount(0);
      setPhase("idle");
    }, HEART_LOVE_BOMB_CLICK_RESET_MS);
  }, []);

  useEffect(() => {
    return () => {
      clearResetTimer();
      if (detonateTimerRef.current) clearTimeout(detonateTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const startDetonation = useCallback(() => {
    setPhase("detonating");
    clearResetTimer();

    detonateTimerRef.current = setTimeout(() => {
      if (originRef.current) {
        triggerLoveBomb(originRef.current);
      } else {
        triggerLoveBomb();
      }

      cooldownTimerRef.current = setTimeout(() => {
        setPhase("idle");
        setClickCount(0);
        originRef.current = null;
      }, 1500);
    }, HEART_LOVE_BOMB_DETONATE_MS * 0.55);
  }, [triggerLoveBomb]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (phase === "detonating" || phase === "cooldown") return;

    originRef.current = { clientX: e.clientX, clientY: e.clientY };
    const next = clickCount + 1;
    setClickCount(next);
    setPhase("charging");
    scheduleClickReset();

    if (next >= HEART_LOVE_BOMB_CLICKS) {
      startDetonation();
    }
  };

  const chargeRatio = clickCount / HEART_LOVE_BOMB_CLICKS;
  const isDetonating = phase === "detonating";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDetonating}
      className={`relative inline-flex items-center justify-center rounded-full p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        isDetonating ? "pointer-events-none" : "hover:scale-105 active:scale-95"
      } transition-transform duration-200`}
      aria-label={
        clickCount > 0
          ? `Love charge ${clickCount} of ${HEART_LOVE_BOMB_CLICKS}`
          : "Click 5 times for a love explosion"
      }
      title={
        clickCount > 0
          ? `${clickCount}/${HEART_LOVE_BOMB_CLICKS}`
          : "Click 5 times — love explosion"
      }
    >
      {/* Charge ring — fills per click, no cracks */}
      <svg
        className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90 pointer-events-none"
        viewBox="0 0 80 80"
        aria-hidden
      >
        <circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-primary/15"
        />
        <circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
          strokeDasharray={213.6}
          strokeDashoffset={213.6 * (1 - chargeRatio)}
          style={{
            filter: chargeRatio > 0 ? "drop-shadow(0 0 8px oklch(0.58 0.22 22 / 0.7))" : undefined,
          }}
        />
      </svg>

      {/* Warm glow builds with each click */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300"
        style={{
          background: `radial-gradient(circle, oklch(0.58 0.22 22 / ${0.15 + chargeRatio * 0.45}) 0%, transparent 70%)`,
          transform: `scale(${1.1 + chargeRatio * 0.35})`,
        }}
        aria-hidden
      />

      {/* Detonation shockwave */}
      {isDetonating && (
        <>
          <span className="absolute inset-0 rounded-full love-bomb-shockwave bg-primary/40" aria-hidden />
          <span
            className="absolute inset-0 rounded-full love-bomb-shockwave bg-primary/25"
            style={{ animationDelay: "0.08s" }}
            aria-hidden
          />
        </>
      )}

      {/* Heart + flying fragments on detonation */}
      <div
        className={`relative w-14 h-14 flex items-center justify-center ${
          isDetonating ? "animate-love-bomb-swell" : ""
        }`}
      >
        {!isDetonating && (
          <Heart
            className={`h-14 w-14 fill-primary text-primary transition-all duration-200 drop-shadow-[0_0_24px_oklch(0.58_0.22_22/0.55)] ${
              clickCount > 0 ? "animate-love-bomb-charge-pulse" : ""
            }`}
            style={{
              filter: `brightness(${1 + chargeRatio * 0.25})`,
            }}
          />
        )}

        {isDetonating &&
          Array.from({ length: FRAGMENT_COUNT }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 love-bomb-fragment pointer-events-none"
              style={{ "--fragment-angle": `${(360 / FRAGMENT_COUNT) * i}deg` } as React.CSSProperties}
              aria-hidden
            >
              <Heart className="h-4 w-4 fill-primary text-primary" />
            </span>
          ))}
      </div>

      {/* Charge ticks */}
      {phase === "charging" && clickCount > 0 && clickCount < HEART_LOVE_BOMB_CLICKS && (
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden>
          {Array.from({ length: HEART_LOVE_BOMB_CLICKS }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-200 ${
                i < clickCount
                  ? "bg-primary scale-110 shadow-[0_0_10px_oklch(0.58_0.22_22/0.8)]"
                  : "bg-primary/20 scale-90"
              }`}
            />
          ))}
        </span>
      )}
    </button>
  );
}
