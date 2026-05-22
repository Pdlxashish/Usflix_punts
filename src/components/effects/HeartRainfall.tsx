/**
 * Canvas heart blast + sprinkle — bursts from click origin, scatters across the page.
 */
import { useEffect, useRef, type RefObject } from "react";
import { useHeartRainfall } from "@/context/heartRainfall";
import {
  HEART_RAINFALL_DURATION_MS,
  HEART_RAINFALL_SPAWN_MS,
  HEART_RAINFALL_MAX_HEARTS,
  HEART_BURST_BASE_COUNT,
  HEART_BURST_STACK_COUNT,
  HEART_BURST_MAX_PER_PRESS,
  HEART_LOVE_BOMB_INTENSITY,
  HEART_LOVE_BOMB_MAIN_BURST_COUNT,
  HEART_LOVE_BOMB_PER_WAVE_COUNT,
  HEART_LOVE_BOMB_SPARK_COUNT,
  HEART_LOVE_BOMB_MAX_HEARTS,
  HEART_LOVE_BOMB_BURST_MIN_MS,
  HEART_LOVE_BOMB_SETTLE_MS,
} from "./heartRainfallConstants";
import { drawHeart, drawSpark } from "./heartRainfallDraw";

interface HeartRainfallProps {
  duration?: number;
  containerRef?: RefObject<HTMLElement | null>;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  angle: number;
  spin: number;
  born: number;
  life: number;
  gravity: number;
  drag: number;
  kind: "heart" | "spark";
}

function getPageBottom(container: HTMLElement): number {
  const footer = container.querySelector("footer");
  if (!footer) {
    return container.scrollHeight;
  }
  const cr = container.getBoundingClientRect();
  const fr = footer.getBoundingClientRect();
  return fr.top - cr.top + 24;
}

export function HeartRainfall({
  duration = HEART_RAINFALL_DURATION_MS,
  containerRef,
  onComplete,
}: HeartRainfallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { burstQueueRef, active } = useHeartRainfall();
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const container =
      containerRef?.current ??
      (document.querySelector("[data-heart-rainfall-page]") as HTMLElement | null) ??
      document.body;

    const canvas = canvasRef.current;
    if (!canvas || !container) return;

    const getSize = () => ({
      width: container.scrollWidth || window.innerWidth,
      height: Math.max(container.scrollHeight, window.innerHeight),
    });

    let { width, height } = getSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const hearts: Particle[] = [];
    const start = performance.now();
    let lastFrame = start;
    let pageBottom = getPageBottom(container);
    let spawnTimer: ReturnType<typeof setInterval> | null = null;
    let layoutTimer: ReturnType<typeof setInterval> | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;
    let disposed = false;

    let loveBombMode = false;
    let loveBombStart = 0;

    const heartCap = () =>
      loveBombMode ? HEART_LOVE_BOMB_MAX_HEARTS : HEART_RAINFALL_MAX_HEARTS;

    const spawnBurst = (x: number, y: number, intensity: number) => {
      const isLoveBomb = intensity >= HEART_LOVE_BOMB_INTENSITY - 2;
      const count = isLoveBomb
        ? intensity >= HEART_LOVE_BOMB_INTENSITY - 0.5
          ? HEART_LOVE_BOMB_MAIN_BURST_COUNT
          : HEART_LOVE_BOMB_PER_WAVE_COUNT
        : Math.min(
            HEART_BURST_MAX_PER_PRESS,
            HEART_BURST_BASE_COUNT + intensity * HEART_BURST_STACK_COUNT
          );
      if (isLoveBomb) {
        loveBombMode = true;
        if (!loveBombStart) loveBombStart = performance.now();
      }

      for (let i = 0; i < count; i++) {
        if (hearts.length >= heartCap()) break;

        const angle = isLoveBomb
          ? (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35
          : Math.random() * Math.PI * 2;
        const speed = isLoveBomb
          ? 520 + Math.random() * 520
          : 220 + Math.random() * 480 * (1 + intensity * 0.12);
        const size = isLoveBomb ? 14 + Math.random() * 28 : 10 + Math.random() * 24;

        hearts.push({
          x: x + (Math.random() - 0.5) * (isLoveBomb ? 8 : 24),
          y: y + (Math.random() - 0.5) * (isLoveBomb ? 8 : 24),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (isLoveBomb ? 40 : 120),
          size,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * (isLoveBomb ? 0.08 : 0.12),
          born: performance.now(),
          life: isLoveBomb ? 6.5 + Math.random() * 4 : 2.5 + Math.random() * 2.5,
          gravity: isLoveBomb ? 70 : 320,
          drag: isLoveBomb ? 0.35 : 0.8,
          kind: "heart",
        });
      }

      if (isLoveBomb) {
        for (let i = 0; i < HEART_LOVE_BOMB_SPARK_COUNT; i++) {
          if (hearts.length >= heartCap()) break;
          const angle = Math.random() * Math.PI * 2;
          const speed = 680 + Math.random() * 420;
          hearts.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 60,
            size: 3 + Math.random() * 6,
            angle: 0,
            spin: 0,
            born: performance.now(),
            life: 0.7 + Math.random() * 0.6,
            gravity: 40,
            drag: 0.2,
            kind: "spark",
          });
        }
      }
    };

    const processBurstQueue = () => {
      const queue = burstQueueRef.current;
      if (queue.length === 0) return;
      if (queue.some((b) => b.intensity >= HEART_LOVE_BOMB_INTENSITY - 2)) {
        loveBombMode = true;
      }
      for (const burst of queue) {
        spawnBurst(burst.x, burst.y, burst.intensity);
      }
      burstQueueRef.current = [];
    };

    const spawnRainHeart = () => {
      if (loveBombMode || hearts.length >= heartCap()) return;

      const size = 14 + Math.random() * 18;
      hearts.push({
        x: size + 12 + Math.random() * (width - size * 2 - 24),
        y: -size - Math.random() * 60,
        vy: 70 + Math.random() * 90,
        vx: (Math.random() - 0.5) * 40,
        size,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.05,
        born: performance.now(),
        life: 8,
        gravity: 320,
        drag: 0.8,
        kind: "heart",
      });
    };

    processBurstQueue();
    spawnRainHeart();
    spawnTimer = setInterval(spawnRainHeart, 220);

    const resize = () => {
      const next = getSize();
      width = next.width;
      height = next.height;
      pageBottom = getPageBottom(container);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    layoutTimer = setInterval(onResize, 600);

    const endSpawn = setTimeout(() => {
      if (spawnTimer) clearInterval(spawnTimer);
      spawnTimer = null;
    }, HEART_RAINFALL_SPAWN_MS);

    const render = (now: number) => {
      if (disposed) return;

      processBurstQueue();

      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;

      const elapsed = now - start;
      let globalFade = 1;
      if (loveBombMode && loveBombStart > 0) {
        const sinceBomb = now - loveBombStart;
        const fadeBegin = HEART_LOVE_BOMB_BURST_MIN_MS + HEART_LOVE_BOMB_SETTLE_MS - 1200;
        if (sinceBomb > fadeBegin) {
          globalFade = Math.max(0, 1 - (sinceBomb - fadeBegin) / 1800);
        }
      } else {
        const fadeStart = duration - 1500;
        globalFade =
          elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / 1500) : 1;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        const age = (now - heart.born) / 1000;
        const fadeWindow = heart.kind === "heart" && loveBombMode ? 1.2 : 0.8;
        const lifeFade =
          age > heart.life - fadeWindow
            ? Math.max(0, 1 - (age - (heart.life - fadeWindow)) / fadeWindow)
            : 1;
        const alpha = globalFade * lifeFade;

        heart.vy += heart.gravity * dt;
        heart.vx *= 1 - heart.drag * dt;
        heart.y += heart.vy * dt;
        heart.x += heart.vx * dt;
        heart.angle += heart.spin;

        const offScreen =
          heart.y > pageBottom + 120 ||
          heart.y < -160 ||
          heart.x < -120 ||
          heart.x > width + 120 ||
          alpha <= 0.02 ||
          age > heart.life + 0.5;

        if (offScreen) {
          hearts.splice(i, 1);
          continue;
        }

        if (heart.kind === "spark") {
          drawSpark(ctx, heart.x, heart.y, heart.size, alpha);
        } else {
          drawHeart(ctx, heart.x, heart.y, heart.size, heart.angle, alpha);
        }
      }

      const keepGoing =
        hearts.length > 0 ||
        burstQueueRef.current.length > 0 ||
        activeRef.current ||
        elapsed < duration;

      if (keepGoing) {
        raf = requestAnimationFrame(render);
      } else {
        disposed = true;
        onComplete?.();
      }
    };

    raf = requestAnimationFrame(render);

    const safetyStop = setTimeout(() => {
      disposed = true;
      onComplete?.();
    }, duration + 8000);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(safetyStop);
      clearTimeout(endSpawn);
      if (spawnTimer) clearInterval(spawnTimer);
      if (layoutTimer) clearInterval(layoutTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [duration, containerRef, onComplete, burstQueueRef]);

  return (
    <div
      data-heart-rainfall-ignore
      className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
      aria-hidden
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
