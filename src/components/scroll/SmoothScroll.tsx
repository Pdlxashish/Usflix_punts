import { ReactLenis, useLenis } from "lenis/react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

function RouteScrollReset() {
  const router = useRouter();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [router.state.location.pathname, lenis]);

  return null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

/** Touch-primary devices use native scroll — avoids stuck scroll over cards/rows */
function useTouchPrimary() {
  const [touchPrimary, setTouchPrimary] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTouchPrimary(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return touchPrimary;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const touchPrimary = useTouchPrimary();

  if (reducedMotion || touchPrimary) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.1,
        duration: 1,
        smoothWheel: true,
        syncTouch: false,
        allowNestedScroll: true,
        wheelMultiplier: 1,
        touchMultiplier: 1,
        gestureOrientation: "vertical",
      }}
    >
      <RouteScrollReset />
      {children}
    </ReactLenis>
  );
}

/** Pause Lenis while overlays/menus lock the page (replaces body overflow hacks) */
export function useLenisLock(locked: boolean) {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    if (locked) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [locked, lenis]);
}
