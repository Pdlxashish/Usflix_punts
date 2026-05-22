import { useEffect, useState } from "react";
import { getCountdownTo, type BirthdayCountdown } from "@/lib/birthday";

export function CountdownCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border py-6 px-3 text-center backdrop-blur transition-all duration-500 ${
        highlight
          ? "border-primary/60 bg-primary/15 shadow-[var(--shadow-glow)] scale-[1.02]"
          : "border-border/60 bg-card/60 hover:border-primary/30"
      }`}
    >
      <p className="font-display text-4xl md:text-5xl tabular-nums text-foreground motion-safe:animate-[birthday-digit-pop_0.45s_ease-out]">
        {label === "Seconds" ? String(value).padStart(2, "0") : value.toLocaleString()}
      </p>
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

export function CountdownGrid({
  countdown,
  urgent = false,
}: {
  countdown: BirthdayCountdown;
  urgent?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <CountdownCell label="Days" value={countdown.days} highlight={urgent} />
      <CountdownCell label="Hours" value={countdown.hours} highlight={urgent} />
      <CountdownCell label="Minutes" value={countdown.minutes} />
      <CountdownCell label="Seconds" value={countdown.seconds} />
    </div>
  );
}

export function useLiveCountdown(target: Date, isToday: boolean): BirthdayCountdown {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (isToday) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isToday]);

  return isToday
    ? { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 }
    : getCountdownTo(target, now);
}
