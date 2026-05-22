/**
 * Love Letter Wall — scrollable section of flip cards.
 * Front shows a preview, back reveals the full message.
 */
import { useEffect, useState } from "react";
import { Mail, Heart } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";

interface LoveLetter {
  id: string;
  from: string;
  preview: string;
  message: string;
  color: string;
  sortRank: number;
  createdAt: string;
}

// Color palette mapped to Tailwind-safe classes
const COLOR_MAP: Record<string, { bg: string; border: string; accent: string; text: string }> = {
  rose:    { bg: "bg-rose-950/60",    border: "border-rose-500/40",    accent: "text-rose-400",    text: "text-rose-100" },
  pink:    { bg: "bg-pink-950/60",    border: "border-pink-500/40",    accent: "text-pink-400",    text: "text-pink-100" },
  purple:  { bg: "bg-purple-950/60", border: "border-purple-500/40",  accent: "text-purple-400",  text: "text-purple-100" },
  amber:   { bg: "bg-amber-950/60",  border: "border-amber-500/40",   accent: "text-amber-400",   text: "text-amber-100" },
  teal:    { bg: "bg-teal-950/60",   border: "border-teal-500/40",    accent: "text-teal-400",    text: "text-teal-100" },
  sky:     { bg: "bg-sky-950/60",    border: "border-sky-500/40",     accent: "text-sky-400",     text: "text-sky-100" },
};

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.rose;
}

function LetterCard({ letter }: { letter: LoveLetter }) {
  const [flipped, setFlipped] = useState(false);
  const c = getColors(letter.color);

  return (
    <div
      className="relative h-64 cursor-pointer select-none"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped((f) => !f)}
      tabIndex={0}
      role="button"
      aria-label={flipped ? "Click to close letter" : `Open letter from ${letter.from}`}
      aria-pressed={flipped}
    >
      {/* Card inner — rotates */}
      <div
        className="relative w-full h-full transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── FRONT ── */}
        <div
          className={`absolute inset-0 rounded-2xl border ${c.bg} ${c.border} backdrop-blur-sm p-6 flex flex-col justify-between shadow-[var(--shadow-card)] hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Envelope icon */}
          <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center ${c.accent}`}>
            <Mail className="h-5 w-5" />
          </div>

          {/* Preview text */}
          <div>
            <p className={`font-display italic text-lg leading-snug ${c.text} line-clamp-3`}>
              "{letter.preview}"
            </p>
            <p className={`mt-3 text-xs uppercase tracking-widest ${c.accent}`}>
              — {letter.from}
            </p>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-white/30 uppercase tracking-widest text-right">
            tap to open ↗
          </p>
        </div>

        {/* ── BACK ── */}
        <div
          className={`absolute inset-0 rounded-2xl border ${c.bg} ${c.border} backdrop-blur-sm p-6 flex flex-col justify-between shadow-[var(--shadow-card)] overflow-hidden`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Heart */}
          <Heart className={`h-5 w-5 fill-current ${c.accent}`} />

          {/* Full message */}
          <p className={`font-display italic text-base leading-relaxed ${c.text} overflow-y-auto flex-1 my-3 pr-1 scrollbar-hide`}>
            {letter.message}
          </p>

          <p className={`text-xs uppercase tracking-widest ${c.accent} text-right`}>
            — {letter.from}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LoveLetterWall() {
  const [letters, setLetters] = useState<LoveLetter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiJson<LoveLetter[]>("/love-letters")
      .then(setLetters)
      .catch(() => setLetters([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && letters.length === 0) return null;

  return (
    <section className="relative py-24 px-6 lg:px-12 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.18 0.08 340 / 0.45) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary">Written with love</p>
            <span className="h-px w-8 bg-primary" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl">
            Love Letter <span className="text-primary italic">Wall</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            Every note we've written to each other. Tap a card to read the full message.
          </p>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {letters.map((letter) => (
              <LetterCard key={letter.id} letter={letter} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
