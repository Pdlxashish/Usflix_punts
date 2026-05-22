import { useEffect, useState, useCallback } from "react";
import { Heart, Calendar } from "lucide-react";
import { useBranding } from "@/context/branding";
import { useHeartRainfall } from "@/context/heartRainfall";

interface TimeBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

function diff(now: Date, since: Date): TimeBreakdown {
  const totalMs = Math.max(0, now.getTime() - since.getTime());
  const totalDays = Math.floor(totalMs / 86400000);

  // Calendar-accurate years/months
  let years = now.getFullYear() - since.getFullYear();
  let months = now.getMonth() - since.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < since.getDate()) { months--; if (months < 0) { years--; months += 11; } }

  // Remaining ms after stripping years/months
  let ms = totalMs;
  const days = Math.floor((ms % 86400000 * 0 + totalDays) % 30.44); // approx days in current month
  ms -= totalDays * 86400000;
  const hours = Math.floor(ms / 3600000); ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000); ms -= minutes * 60000;
  const seconds = Math.floor(ms / 1000);

  return { years, months, days: totalDays % 30, hours, minutes, seconds, totalDays };
}

export function TimeTogether() {
  const { branding } = useBranding();
  const { triggerHeartBurst } = useHeartRainfall();
  const [popping, setPopping] = useState(false);
  const [t, setT] = useState<TimeBreakdown>({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0 });

  const handleLoveBurst = useCallback(
    (e: React.MouseEvent) => {
      triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY });
      setPopping(true);
      window.setTimeout(() => setPopping(false), 320);
    },
    [triggerHeartBurst]
  );

  const since = new Date(branding.relationshipStartDate);
  const sinceLabel = since.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  useEffect(() => {
    setT(diff(new Date(), since));
    const id = setInterval(() => setT(diff(new Date(), since)), 1000);
    return () => clearInterval(id);
  }, [branding.relationshipStartDate]);

  const bigCells: [string, number, string][] = [
    ["Years", t.years, "of choosing each other"],
    ["Months", t.months, "since last anniversary"],
    ["Days", t.days, "in this month together"],
    ["Hours", t.hours, "of today, shared"],
  ];

  const smallCells: [string, number][] = [
    ["Minutes", t.minutes],
    ["Seconds", t.seconds],
  ];

  return (
    <section className="py-24 px-6 lg:px-12 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.18 0.06 22 / 0.5) 0%, transparent 70%)" }}
      />

      <div className="max-w-5xl mx-auto text-center">
        <button
          type="button"
          onClick={handleLoveBurst}
          className={`mx-auto flex items-center justify-center rounded-full p-2 transition-transform duration-200 hover:scale-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            popping ? "scale-125" : "scale-100"
          }`}
          aria-label="Love blast"
          title="Click for love! Rapid clicks = bigger blast"
        >
          <Heart className="h-10 w-10 fill-primary text-primary animate-pulse" />
        </button>
        <h2 className="font-display text-4xl md:text-5xl mt-5">Time Together</h2>
        <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Since {sinceLabel} · {t.totalDays.toLocaleString()} days and counting
        </p>

        {/* Big cells */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {bigCells.map(([label, value, sub]) => (
            <div
              key={label}
              className="bg-card/60 backdrop-blur border border-border/60 rounded-xl py-8 px-4 shadow-[var(--shadow-card)] group hover:border-primary/40 hover:bg-card/80 transition-all duration-300"
            >
              <p className="font-display text-5xl md:text-6xl text-foreground tabular-nums group-hover:text-primary transition-colors duration-300">
                {value.toLocaleString()}
              </p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mt-2">
                {label}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{sub}</p>
            </div>
          ))}
        </div>

        {/* Small live cells */}
        <div className="mt-4 grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {smallCells.map(([label, value]) => (
            <div
              key={label}
              className="bg-card/40 border border-border/40 rounded-lg py-5 px-4 shadow-[var(--shadow-card)]"
            >
              <p className="font-display text-3xl text-foreground tabular-nums">
                {String(value).padStart(2, "0")}
              </p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 font-display italic text-lg text-foreground/60">
          Every second is a memory we treasure.
        </p>
      </div>
    </section>
  );
}
