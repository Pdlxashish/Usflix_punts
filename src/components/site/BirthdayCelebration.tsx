/**
 * Birthday countdown, celebration mode, and gentle reminders.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, Cake, Gift, PartyPopper } from "lucide-react";
import { useProfile, type Profile } from "@/context/profile";
import { useHeartRainfall } from "@/context/heartRainfall";
import { useToast } from "@/components/ui/Toast";
import { getMediaUrl } from "@/lib/api";
import {
  daysUntilBirthday,
  formatBirthdayLabel,
  getCountdownTo,
  getNextBirthday,
  getTurningAge,
  isBirthdayToday,
  REMINDER_DAYS,
  yearProgressUntilBirthday,
} from "@/lib/birthday";

const STORAGE_REMINDERS = "usflix_birthday_reminders";
const STORAGE_NOTIFIED = "usflix_birthday_notified";

function avatarShapeClass(shape?: string | null): string {
  if (shape === "circle") return "rounded-full";
  if (shape === "rounded") return "rounded-2xl";
  return "rounded-md";
}

function pushNotification(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function loadRemindersEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_REMINDERS) !== "off";
  } catch {
    return true;
  }
}

function notifiedKey(profileId: string, kind: string): string {
  const y = new Date().getFullYear();
  return `${profileId}:${y}:${kind}`;
}

function wasNotified(profileId: string, kind: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFIED);
    const set: string[] = raw ? JSON.parse(raw) : [];
    return set.includes(notifiedKey(profileId, kind));
  } catch {
    return false;
  }
}

function markNotified(profileId: string, kind: string) {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFIED);
    const set: string[] = raw ? JSON.parse(raw) : [];
    const key = notifiedKey(profileId, kind);
    if (!set.includes(key)) {
      set.push(key);
      localStorage.setItem(STORAGE_NOTIFIED, JSON.stringify(set.slice(-80)));
    }
  } catch { /* ignore */ }
}

interface ProfileBirthdayInfo {
  profile: Profile;
  birthday: string;
  isToday: boolean;
  daysUntil: number;
  next: Date;
  label: string;
  turningAge: number | null;
  progress: number;
}

function buildInfo(profile: Profile): ProfileBirthdayInfo | null {
  if (!profile.birthday) return null;
  const now = new Date();
  const isToday = isBirthdayToday(profile.birthday, now);
  const next = getNextBirthday(profile.birthday, now);
  return {
    profile,
    birthday: profile.birthday,
    isToday,
    daysUntil: daysUntilBirthday(profile.birthday, now),
    next,
    label: formatBirthdayLabel(profile.birthday),
    turningAge: getTurningAge(profile.birthday, next),
    progress: yearProgressUntilBirthday(profile.birthday, now),
  };
}

function CountdownCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
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

function ProfileAvatar({ profile, size = "md" }: { profile: Profile; size?: "md" | "lg" }) {
  const shape = avatarShapeClass(profile.avatar_shape);
  const dim = size === "lg" ? "w-20 h-20 sm:w-24 sm:h-24 text-3xl" : "w-14 h-14 text-xl";
  return (
    <div
      className={`${dim} ${shape} ${profile.color} flex items-center justify-center font-display text-white overflow-hidden shrink-0 ring-2 ring-white/20 shadow-lg`}
    >
      {profile.profile_picture_url ? (
        <img src={getMediaUrl(profile.profile_picture_url)} alt="" className={`w-full h-full object-cover ${shape}`} />
      ) : (
        profile.name.charAt(0)
      )}
    </div>
  );
}

function FloatingDecor() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${8 + (i * 6.5) % 88}%`,
        delay: `${(i * 0.7) % 5}s`,
        dur: `${6 + (i % 4)}s`,
        emoji: i % 3 === 0 ? "🎈" : i % 3 === 1 ? "✨" : "🎂",
        size: 14 + (i % 5) * 4,
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-[1]" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="birthday-float absolute opacity-40 motion-reduce:hidden"
          style={{
            left: p.left,
            animationDuration: p.dur,
            animationDelay: p.delay,
            fontSize: p.size,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

function BirthdayCountdownCard({ entry, now }: { entry: ProfileBirthdayInfo; now: Date }) {
  const urgent = !entry.isToday && entry.daysUntil <= 7;
  const countdown = entry.isToday
    ? { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 }
    : getCountdownTo(entry.next, now);

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-8 relative overflow-hidden transition-all duration-500 ${
        entry.isToday
          ? "border-primary/70 bg-gradient-to-br from-primary/20 via-card/80 to-card/60 shadow-[var(--shadow-glow)]"
          : urgent
            ? "border-primary/40 bg-card/70 backdrop-blur shadow-[var(--shadow-card)]"
            : "border-border/60 bg-card/60 backdrop-blur"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
        <div className="relative">
          <ProfileAvatar profile={entry.profile} size="lg" />
          {entry.isToday && (
            <span className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs motion-safe:animate-ping">
              <PartyPopper className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <p className="font-display text-2xl sm:text-3xl truncate">{entry.profile.name}</p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <Gift className="h-4 w-4 shrink-0 text-primary" />
            {entry.label}
            {entry.turningAge != null && (
              <span className="text-foreground/80">· turning {entry.turningAge}</span>
            )}
          </p>
          {!entry.isToday && (
            <div className="mt-4 h-2 rounded-full bg-muted/50 overflow-hidden max-w-xs mx-auto sm:mx-0">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                style={{ width: `${entry.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {entry.isToday ? (
        <p className="mt-8 text-center font-display italic text-xl text-primary motion-safe:animate-pulse">
          The countdown is zero — time to celebrate! 🎉
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <CountdownCell label="Days" value={countdown.days} highlight={urgent} />
          <CountdownCell label="Hours" value={countdown.hours} highlight={urgent} />
          <CountdownCell label="Minutes" value={countdown.minutes} />
          <CountdownCell label="Seconds" value={countdown.seconds} />
        </div>
      )}
    </div>
  );
}

function ConfettiBurst() {
  const bits = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        rot: (i * 37) % 360,
        color: i % 2 === 0 ? "var(--primary)" : "oklch(0.75 0.12 85)",
        delay: `${(i % 8) * 0.05}s`,
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className="birthday-confetti absolute w-2 h-3 rounded-sm motion-reduce:hidden"
          style={{
            left: b.left,
            top: "-8%",
            background: b.color,
            transform: `rotate(${b.rot}deg)`,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
}

export function BirthdayCelebration() {
  const { profiles } = useProfile();
  const { triggerHeartBurst, triggerHeartRainfall } = useHeartRainfall();
  const toast = useToast();
  const [now, setNow] = useState(() => new Date());
  const [remindersOn, setRemindersOn] = useState(loadRemindersEnabled);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const todayRainTriggered = useRef(false);

  const entries = useMemo(
    () =>
      profiles
        .map(buildInfo)
        .filter((x): x is ProfileBirthdayInfo => x !== null)
        .sort((a, b) => {
          if (a.isToday && !b.isToday) return -1;
          if (!a.isToday && b.isToday) return 1;
          return a.daysUntil - b.daysUntil;
        }),
    [profiles]
  );

  const anyToday = entries.some((e) => e.isToday);
  const nextEntry = entries.find((e) => !e.isToday) ?? entries[0];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!anyToday || todayRainTriggered.current) return;
    todayRainTriggered.current = true;
    triggerHeartRainfall();
  }, [anyToday, triggerHeartRainfall]);

  const runReminders = useCallback(() => {
    if (!remindersOn) return;
    for (const e of entries) {
      if (e.isToday) {
        const kind = "today";
        if (!wasNotified(e.profile.id, kind)) {
          markNotified(e.profile.id, kind);
          const msg = `Today is ${e.profile.name}'s birthday! 🎂`;
          toast.success(msg, 12000);
          pushNotification("Happy Birthday! 🎂", msg);
        }
        continue;
      }
      for (const d of REMINDER_DAYS) {
        if (e.daysUntil === d) {
          const kind = `d${d}`;
          if (!wasNotified(e.profile.id, kind)) {
            markNotified(e.profile.id, kind);
            const msg =
              d === 1
                ? `${e.profile.name}'s birthday is tomorrow! 🎁`
                : `${e.profile.name}'s birthday in ${d} days!`;
            toast.success(msg, 8000);
            pushNotification("Birthday reminder", msg);
          }
        }
      }
    }
  }, [entries, remindersOn, toast]);

  useEffect(() => {
    runReminders();
    const id = setInterval(runReminders, 60_000);
    return () => clearInterval(id);
  }, [runReminders]);

  const toggleReminders = () => {
    const next = !remindersOn;
    setRemindersOn(next);
    localStorage.setItem(STORAGE_REMINDERS, next ? "on" : "off");
    toast.success(next ? "Birthday reminders on" : "Birthday reminders off");
  };

  const requestNotify = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifyPermission(perm);
    if (perm === "granted") toast.success("You'll get birthday alerts!");
  };

  const handleCelebrateClick = (e: React.MouseEvent) => {
    triggerHeartBurst({ clientX: e.clientX, clientY: e.clientY });
  };

  if (entries.length === 0) return null;

  return (
    <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% 40%, oklch(0.2 0.08 330 / 0.45) 0%, transparent 68%)",
        }}
      />
      <FloatingDecor />
      {anyToday && <ConfettiBurst />}

      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <button
            type="button"
            onClick={handleCelebrateClick}
            className="mx-auto flex items-center justify-center rounded-full p-2 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Celebrate"
          >
            <Cake
              className={`h-10 w-10 text-primary ${anyToday ? "motion-safe:animate-bounce" : "motion-safe:animate-pulse"}`}
            />
          </button>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl mt-4">
            {anyToday ? "Happy Birthday!" : "Birthdays We Celebrate"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
            {anyToday
              ? `Today belongs to ${entries.filter((e) => e.isToday).map((e) => e.profile.name).join(" & ")} — make it unforgettable.`
              : entries.length > 1
                ? `${entries.length} birthdays on the calendar · next: ${nextEntry.profile.name}`
                : `Counting down to ${nextEntry.profile.name} · ${nextEntry.label}`}
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {entries.map((e) => (
            <BirthdayCountdownCard key={e.profile.id} entry={e} now={now} />
          ))}
        </div>

        {/* Reminders */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleReminders}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
              remindersOn
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/30"
            }`}
          >
            {remindersOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            Reminders {remindersOn ? "on" : "off"}
          </button>
          {notifyPermission !== "granted" && notifyPermission !== "unsupported" && (
            <button
              type="button"
              onClick={requestNotify}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
              Enable browser alerts
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70 italic">
          Set birthdays in Admin → Profiles. We&apos;ll remind you 7, 3, and 1 day before — and on the day.
        </p>
      </div>
    </section>
  );
}
