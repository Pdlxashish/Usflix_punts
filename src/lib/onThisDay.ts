import type { MediaItem } from "@/data/media";

export interface OnThisDayMemory {
  item: MediaItem;
  yearsAgo: number;
  memoryYear: number;
}

/** Memories uploaded on this calendar day in a previous year. */
export function getOnThisDayMemories(items: MediaItem[], ref = new Date()): OnThisDayMemory[] {
  const month = ref.getMonth();
  const day = ref.getDate();
  const currentYear = ref.getFullYear();

  const matches: OnThisDayMemory[] = [];

  for (const item of items) {
    if (item.status !== "ready" || item.type === "voice") continue;
    if (!item.createdAt) continue;

    const d = new Date(item.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getMonth() !== month || d.getDate() !== day) continue;

    const memoryYear = d.getFullYear();
    const yearsAgo = currentYear - memoryYear;
    if (yearsAgo < 1) continue;

    matches.push({ item, yearsAgo, memoryYear });
  }

  return matches.sort((a, b) => b.yearsAgo - a.yearsAgo || a.item.title.localeCompare(b.item.title));
}

export function formatOnThisDayHeading(ref = new Date()): string {
  return ref.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
