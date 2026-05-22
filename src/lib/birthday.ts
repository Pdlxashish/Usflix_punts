/**
 * Birthday countdown helpers — month/day based, year used only for age.
 */

export interface BirthdayCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function parseBirthdayDate(birthday: string): Date {
  const d = new Date(birthday);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid birthday");
  return d;
}

export function isBirthdayToday(birthday: string, ref = new Date()): boolean {
  const b = parseBirthdayDate(birthday);
  return ref.getMonth() === b.getMonth() && ref.getDate() === b.getDate();
}

/** Next occurrence of this birthday (today if it's their day). */
export function getNextBirthday(birthday: string, ref = new Date()): Date {
  const b = parseBirthdayDate(birthday);
  const month = b.getMonth();
  const day = b.getDate();
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let candidate = new Date(ref.getFullYear(), month, day);
  if (candidate < refDay) {
    candidate = new Date(ref.getFullYear() + 1, month, day);
  }
  return candidate;
}

export function daysUntilBirthday(birthday: string, ref = new Date()): number {
  if (isBirthdayToday(birthday, ref)) return 0;
  const next = getNextBirthday(birthday, ref);
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const nextDay = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  return Math.round((nextDay.getTime() - refDay.getTime()) / 86400000);
}

export function getCountdownTo(target: Date, ref = new Date()): BirthdayCountdown {
  const totalMs = Math.max(0, target.getTime() - ref.getTime());
  const days = Math.floor(totalMs / 86400000);
  let rem = totalMs % 86400000;
  const hours = Math.floor(rem / 3600000);
  rem -= hours * 3600000;
  const minutes = Math.floor(rem / 60000);
  rem -= minutes * 60000;
  const seconds = Math.floor(rem / 1000);
  return { days, hours, minutes, seconds, totalMs };
}

/** Age they turn on the upcoming birthday. */
export function getTurningAge(birthday: string, nextBirthday: Date): number | null {
  const b = parseBirthdayDate(birthday);
  if (b.getFullYear() < 1900 || b.getFullYear() > nextBirthday.getFullYear()) return null;
  return nextBirthday.getFullYear() - b.getFullYear();
}

export function formatBirthdayLabel(birthday: string): string {
  return parseBirthdayDate(birthday).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/** 0–100 progress through the year until next birthday. */
export function yearProgressUntilBirthday(birthday: string, ref = new Date()): number {
  const b = parseBirthdayDate(birthday);
  const last = new Date(ref.getFullYear(), b.getMonth(), b.getDate());
  let lastOcc = last;
  if (last > ref) lastOcc = new Date(ref.getFullYear() - 1, b.getMonth(), b.getDate());
  const next = getNextBirthday(birthday, ref);
  const span = next.getTime() - lastOcc.getTime();
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((ref.getTime() - lastOcc.getTime()) / span) * 100)));
}

export const REMINDER_DAYS = [7, 3, 1] as const;
