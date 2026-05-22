/**
 * Next relationship anniversary — live countdown from branding.relationshipStartDate.
 */
import { useEffect, useMemo, useRef } from "react";
import { Calendar, Heart, Sparkles } from "lucide-react";
import { useBranding } from "@/context/branding";
import { useHeartRainfall } from "@/context/heartRainfall";
import {
  daysUntilBirthday,
  formatBirthdayLabel,
  getNextBirthday,
  getTurningAge,
  isBirthdayToday,
  yearProgressUntilBirthday,
} from "@/lib/birthday";
import { CountdownGrid, useLiveCountdown } from "@/components/site/CountdownGrid";

export function AnniversaryCountdown() {
  const { branding } = useBranding();
  const { triggerHeartBurst, triggerHeartRainfall } = useHeartRainfall();
  const todayRainTriggered = useRef(false);

  const startDate = branding.relationshipStartDate;
  const isValid = useMemo(() => {
    if (!startDate) return false;
    const d = new Date(startDate);
    return !Number.isNaN(d.getTime());
  }, [startDate]);

  const isToday = isValid && isBirthdayToday(startDate);
  const next = isValid ? getNextBirthday(startDate) : new Date();
  const daysUntil = isValid ? daysUntilBirthday(startDate) : 0;
  const urgent = isValid && !isToday && daysUntil <= 7;
  const yearsTogether = isValid ? getTurningAge(startDate, next) : null;
  const progress = isValid ? yearProgressUntilBirthday(startDate) : 0;
  const label = isValid ? formatBirthdayLabel(startDate) : "";
  const sinceLabel = isValid
    ? new Date(startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  const countdown = useLiveCountdown(next, isToday);

  useEffect(() => {
    if (!isToday || todayRainTriggered.current) return;
    todayRainTriggered.current = true;
    triggerHeartRainfall();
  }, [isToday, triggerHeartRainfall]);

  if (!isValid) return null;

  return (
    <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 45%, oklch(0.2 0.07 22 / 0.5) 0%, transparent 68%)",
        }}
      />

      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <button
            type="button"
            onClick={(e) => triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY })}
            className="mx-auto flex items-center justify-center rounded-full p-2 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Celebrate anniversary"
          >
            <Heart
              className={`h-10 w-10 fill-primary text-primary ${isToday ? "motion-safe:animate-bounce" : "motion-safe:animate-pulse"}`}
            />
          </button>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl mt-4">
            {isToday ? "Happy Anniversary!" : "Our Next Anniversary"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto flex items-center justify-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 shrink-0" />
            Together since {sinceLabel}
            {yearsTogether != null && !isToday && (
              <span className="text-foreground/80">· celebrating year {yearsTogether}</span>
            )}
          </p>
        </div>

        <div
          className={`mt-10 rounded-2xl border p-6 sm:p-8 relative overflow-hidden transition-all duration-500 ${
            isToday
              ? "border-primary/70 bg-gradient-to-br from-primary/20 via-card/80 to-card/60 shadow-[var(--shadow-glow)]"
              : urgent
                ? "border-primary/40 bg-card/70 backdrop-blur shadow-[var(--shadow-card)]"
                : "border-border/60 bg-card/60 backdrop-blur"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/40">
              <Sparkles className="h-10 w-10 text-primary" />
              {isToday && (
                <span className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground motion-safe:animate-ping">
                  <Heart className="h-4 w-4 fill-current" />
                </span>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <p className="font-display text-2xl sm:text-3xl">
                {isToday ? "Another year of us" : label}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isToday
                  ? "Every second since that first day still matters."
                  : `${daysUntil} day${daysUntil === 1 ? "" : "s"} until we mark the calendar again`}
              </p>
              {!isToday && (
                <div className="mt-4 h-2 rounded-full bg-muted/50 overflow-hidden max-w-xs mx-auto sm:mx-0">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {isToday ? (
            <p className="mt-8 text-center font-display italic text-xl text-primary motion-safe:animate-pulse">
              Happy anniversary — here&apos;s to every memory still ahead. 💕
            </p>
          ) : (
            <div className="mt-8">
              <CountdownGrid countdown={countdown} urgent={urgent} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
