/**
 * VoiceNoteRow — displays voice note cards with an inline audio player.
 */
import { useState, useRef } from "react";
import { Mic, Play, Pause } from "lucide-react";
import type { MediaItem } from "@/data/media";
import { formatDuration } from "@/data/media";
import { getMediaUrl } from "@/lib/api";

interface VoiceNoteRowProps {
  title: string;
  items: MediaItem[];
}

function VoiceNoteCard({ item }: { item: MediaItem }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.duration ?? 0);

  const rawAudioSrc = item.audioUrl ?? "";
  const audioSrc = rawAudioSrc ? getMediaUrl(rawAudioSrc) : "";

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="shrink-0 w-[280px] bg-card/60 border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors">
      {/* Icon + title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.category} · {item.year}</p>
        </div>
      </div>

      {/* Waveform-style progress bar */}
      <div className="mb-3 relative">
        <div className="relative h-8 flex items-center gap-0.5">
          {Array.from({ length: 40 }).map((_, i) => {
            const filled = (i / 40) * 100 < progress;
            const height = 20 + Math.sin(i * 0.8) * 12 + Math.cos(i * 1.3) * 8;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-100 ${filled ? "bg-primary" : "bg-border/60"}`}
                style={{ height: `${Math.max(4, height)}%` }}
              />
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => {
            const a = audioRef.current;
            if (a) a.currentTime = Number(e.target.value);
            setCurrentTime(Number(e.target.value));
          }}
          className="w-full h-8 opacity-0 absolute inset-0 cursor-pointer"
          aria-label="Seek audio"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={!audioSrc}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing
            ? <Pause className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
            : <Play className="h-4 w-4 fill-primary-foreground text-primary-foreground ml-0.5" />
          }
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground line-clamp-1">{item.tagline || item.description}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>

      {/* Hidden audio element */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => { setPlaying(false); setCurrentTime(0); }}
          preload="metadata"
        />
      )}
    </div>
  );
}

export function VoiceNoteRow({ title, items }: VoiceNoteRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="py-6">
      <div className="px-6 lg:px-16 mb-4 flex items-center gap-3">
        <Mic className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl md:text-3xl text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground/60">{items.length} {items.length === 1 ? "note" : "notes"}</span>
      </div>
      <div className="scroll-row-x flex gap-3 sm:gap-4 px-4 sm:px-6 lg:px-16 pb-4">
        {items.map((item) => (
          <VoiceNoteCard key={item.id} item={item} />
        ))}
        <div className="shrink-0 w-4" aria-hidden="true" />
      </div>
    </section>
  );
}
