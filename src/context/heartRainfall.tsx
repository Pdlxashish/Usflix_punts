/**
 * Heart Rainfall Context — burst blasts + optional full-page sprinkle
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type MutableRefObject,
} from "react";
import {
  HEART_RAINFALL_DURATION_MS,
  HEART_BURST_EXTEND_MS,
  HEART_BURST_MAX_STREAK,
  HEART_LOVE_BOMB_INTENSITY,
  HEART_LOVE_BOMB_DURATION_MS,
  HEART_LOVE_BOMB_WAVE_DELAYS_MS,
  HEART_LOVE_BOMB_BURST_MIN_MS,
} from "@/components/effects/heartRainfallConstants";

export interface HeartBurst {
  id: number;
  x: number;
  y: number;
  intensity: number;
}

interface HeartRainfallContextValue {
  active: boolean;
  burstQueueRef: MutableRefObject<HeartBurst[]>;
  triggerHeartBurst: (origin?: { clientX: number; clientY: number }) => void;
  /** Full-page effect (welcome + legacy triggers) */
  triggerHeartRainfall: () => void;
  /** 5-click love bomb — cracks then scatters hearts across the whole page */
  triggerLoveBomb: (origin?: { clientX: number; clientY: number }) => void;
}

const HeartRainfallContext = createContext<HeartRainfallContextValue | null>(null);

function getBurstOrigin(origin?: { clientX: number; clientY: number }) {
  const container = document.querySelector(
    "[data-heart-rainfall-page]"
  ) as HTMLElement | null;

  if (!container) {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  const rect = container.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;

  if (origin) {
    return {
      x: origin.clientX - rect.left,
      y: origin.clientY - rect.top + scrollY,
    };
  }

  return {
    x: rect.width / 2,
    y: rect.height * 0.35 + scrollY,
  };
}

export function HeartRainfallProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const burstQueueRef = useRef<HeartBurst[]>([]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakRef = useRef(0);
  const streakResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extendActivity = useCallback((ms: number) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setActive(false);
      burstQueueRef.current = [];
    }, ms);
  }, []);

  const triggerHeartBurst = useCallback(
    (origin?: { clientX: number; clientY: number }) => {
      streakRef.current = Math.min(streakRef.current + 1, HEART_BURST_MAX_STREAK);
      if (streakResetRef.current) clearTimeout(streakResetRef.current);
      streakResetRef.current = setTimeout(() => {
        streakRef.current = 0;
      }, 800);

      const { x, y } = getBurstOrigin(origin);
      burstQueueRef.current.push({
        id: Date.now() + Math.random(),
        x,
        y,
        intensity: streakRef.current,
      });

      setActive(true);
      extendActivity(HEART_BURST_EXTEND_MS);
    },
    [extendActivity]
  );

  const triggerHeartRainfall = useCallback(() => {
    const { x, y } = getBurstOrigin();
    burstQueueRef.current.push({
      id: Date.now(),
      x,
      y: y * 0.5,
      intensity: 2,
    });
    setActive(true);
    extendActivity(HEART_RAINFALL_DURATION_MS + 2500);
  }, [extendActivity]);

  const triggerLoveBomb = useCallback(
    (origin?: { clientX: number; clientY: number }) => {
      const container = document.querySelector(
        "[data-heart-rainfall-page]"
      ) as HTMLElement | null;
      const pageW = container?.scrollWidth ?? window.innerWidth;
      const pageH = container?.scrollHeight ?? window.innerHeight;
      const center = getBurstOrigin(origin);

      const pushBurst = (x: number, y: number, intensity: number) => {
        burstQueueRef.current.push({
          id: Date.now() + Math.random(),
          x,
          y,
          intensity,
        });
        setActive(true);
      };

      setActive(true);
      extendActivity(HEART_LOVE_BOMB_DURATION_MS);

      // Shockwave waves — spread across full burst window (≥5s)
      HEART_LOVE_BOMB_WAVE_DELAYS_MS.forEach((delay, wave) => {
        setTimeout(() => {
          pushBurst(
            center.x,
            center.y,
            wave === 0 ? HEART_LOVE_BOMB_INTENSITY : HEART_LOVE_BOMB_INTENSITY - 1.5
          );
          extendActivity(HEART_LOVE_BOMB_DURATION_MS);
        }, delay);
      });

      // Edge blooms staggered through the burst window
      const edgeTargets: [number, number][] = [
        [pageW * 0.5, pageH * 0.06],
        [pageW * 0.5, pageH * 0.94],
        [pageW * 0.06, pageH * 0.45],
        [pageW * 0.94, pageH * 0.45],
        [pageW * 0.12, pageH * 0.12],
        [pageW * 0.88, pageH * 0.12],
        [pageW * 0.12, pageH * 0.88],
        [pageW * 0.88, pageH * 0.88],
      ];

      edgeTargets.forEach(([tx, ty], i) => {
        const edgeDelay = 200 + (i / edgeTargets.length) * (HEART_LOVE_BOMB_BURST_MIN_MS - 200);
        setTimeout(() => {
          pushBurst(
            center.x + (tx - center.x) * 0.22,
            center.y + (ty - center.y) * 0.22,
            12
          );
          extendActivity(HEART_LOVE_BOMB_DURATION_MS);
        }, edgeDelay);
      });
    },
    [extendActivity]
  );

  return (
    <HeartRainfallContext.Provider
      value={{
        active,
        burstQueueRef,
        triggerHeartBurst,
        triggerHeartRainfall,
        triggerLoveBomb,
      }}
    >
      {children}
    </HeartRainfallContext.Provider>
  );
}

export function useHeartRainfall() {
  const ctx = useContext(HeartRainfallContext);
  if (!ctx) throw new Error("useHeartRainfall must be used inside HeartRainfallProvider");
  return ctx;
}
