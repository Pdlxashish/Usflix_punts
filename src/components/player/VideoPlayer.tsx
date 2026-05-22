/**
 * VideoPlayer — Req 4 (all 10 AC) + Req 11 (keyboard / ARIA / reduced-motion)
 *
 * AC1  Full-viewport modal frame, video ≥ 80 vh
 * AC2  Play/pause, volume 0-100%, mute, seek bar, fullscreen — on-screen + keyboard
 * AC3  Space → toggle play/pause (≤ 100 ms)
 * AC4  F → toggle fullscreen (≤ 100 ms)
 * AC5  Seek bar → position within ±1 s in 500 ms; buffering indicator on timeout
 * AC6  Buffering spinner; controls always visible while buffering
 * AC7  End-of-video overlay: Replay + Back to Browse
 * AC8  Resume prompt when saved position > 5 s from start and > 30 s from end
 * AC10 Title/collection overlay: first 3 s + on pointer move; fades after 3 s idle
 */
import {
  useRef, useState, useEffect, useCallback, type RefObject,
} from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, ArrowLeft, Loader2, Settings, FastForward, MessageSquare, X, Trash2
} from "lucide-react";
import { formatDuration } from "@/data/media";
import { useContent } from "@/context/content";
import { useProfile } from "@/context/profile";

// ─── Session storage key for resume positions ─────────────────────────────────
const RESUME_KEY = "usflix_resume";

function getResumePositions(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveResumePosition(id: string, pos: number) {
  try {
    const map = getResumePositions();
    map[id] = pos;
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface VideoPlayerProps {
  mediaId: string;
  src: string;
  title: string;
  collectionName: string;
  onClose: () => void;
  onPlayNext?: (mediaId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function VideoPlayer({ mediaId, src, title, collectionName, onClose, onPlayNext }: VideoPlayerProps) {
  const { mediaItems } = useContent();
  const { activeProfile, profiles, comments, addComment, deleteComment } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);   // title overlay
  const [showControls, setShowControls] = useState(true);
  const [resumePos, setResumePos] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  
  const [nextVideoId, setNextVideoId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetOverlayTimer = useCallback(() => {
    setShowOverlay(true);
    setShowControls(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
      setShowControls(false);
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(seconds, v.duration || 0));
  }, []);

  // ── Mount: load saved resume position (Req 4 AC8) ──────────────────────
  useEffect(() => {
    const saved = getResumePositions()[mediaId];
    if (saved && saved > 5) {
      setResumePos(saved);
      // Don't show prompt yet — wait for duration to check > 30s from end
    } else {
      // No resume position, autoplay immediately
      const v = videoRef.current;
      if (v) {
        v.play().then(() => {
          setPlaying(true);
        }).catch(() => {
          // Autoplay blocked by browser, user needs to click play
          setPlaying(false);
        });
      }
    }
    // Show overlay + controls on mount
    resetOverlayTimer();
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [mediaId, resetOverlayTimer]);

  // ── Lock body scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Keyboard shortcuts (Req 4 AC2/3/4) ────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          resetOverlayTimer();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "ArrowRight":
          e.preventDefault();
          seek((videoRef.current?.currentTime ?? 0) + 10);
          resetOverlayTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek((videoRef.current?.currentTime ?? 0) - 10);
          resetOverlayTimer();
          break;
        case "Escape":
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleFullscreen, toggleMute, seek, onClose, resetOverlayTimer]);

  // ── Fullscreen change listener ─────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Video event handlers ───────────────────────────────────────────────────
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    // Save resume position every 5 s
    if (Math.floor(v.currentTime) % 5 === 0) {
      saveResumePosition(mediaId, v.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    // Req 4 AC8: show resume prompt only if > 5s from start AND > 30s from end
    if (resumePos !== null && resumePos > 5 && v.duration - resumePos > 30) {
      setShowResumePrompt(true);
    } else if (resumePos === null) {
      // No resume position, ensure video starts playing
      v.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        // Autoplay blocked, user needs to click play
        setPlaying(false);
      });
    }
  };

  const onWaiting = () => setBuffering(true);
  const onCanPlay = () => setBuffering(false);
  const onPlay = () => { setPlaying(true); setEnded(false); };
  const onPause = () => setPlaying(false);
  const onEnded = () => {
    setPlaying(false);
    setEnded(true);
    setShowOverlay(true);
    setShowControls(true);
    saveResumePosition(mediaId, 0); // clear resume on finish
    
    // Find next video
    const currentItem = mediaItems.find(m => m.id === mediaId);
    if (currentItem) {
      const catItems = mediaItems
        .filter(m => m.category === currentItem.category && m.type === "video" && m.status === "ready")
        .sort((a, b) => a.sortRank - b.sortRank);
      
      const idx = catItems.findIndex(m => m.id === mediaId);
      if (idx !== -1 && idx < catItems.length - 1) {
        setNextVideoId(catItems[idx + 1].id);
        setCountdown(5);
      }
    }
  };

  // Countdown timer logic
  useEffect(() => {
    if (countdown === null || !nextVideoId) return;
    
    if (countdown <= 0) {
      if (onPlayNext) onPlayNext(nextVideoId);
      setCountdown(null);
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => prev! - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, nextVideoId, onPlayNext]);

  // ── Touch handling (Req 4 AC9) ─────────────────────────────────────────────
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    const now = Date.now();
    const last = lastTapRef.current;

    if (last && now - last.time < 300) {
      // Double-tap
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const isRight = touch.clientX > rect.left + rect.width / 2;
      seek((videoRef.current?.currentTime ?? 0) + (isRight ? 10 : -10));
      lastTapRef.current = null;
    } else {
      // Single tap — wait to see if double-tap follows
      lastTapRef.current = { time: now, x: touch.clientX };
      tapTimerRef.current = setTimeout(() => {
        togglePlay();
        resetOverlayTimer();
        lastTapRef.current = null;
      }, 300);
    }
  }, [togglePlay, seek, resetOverlayTimer]);

  // ── Seek bar change ────────────────────────────────────────────────────────
  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
    resetOverlayTimer();
  };

  // ── Resume prompt handlers ─────────────────────────────────────────────────
  const acceptResume = () => {
    if (resumePos !== null) seek(resumePos);
    setShowResumePrompt(false);
    videoRef.current?.play();
    setPlaying(true);
  };
  const dismissResume = () => {
    setShowResumePrompt(false);
    videoRef.current?.play();
    setPlaying(true);
  };

  // ── Replay ────────────────────────────────────────────────────────────────
  const replay = () => {
    seek(0);
    setEnded(false);
    videoRef.current?.play();
    setPlaying(true);
  };

  // ── Volume change ─────────────────────────────────────────────────────────
  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = Number(e.target.value);
    if (v) { v.volume = val; v.muted = val === 0; }
    setVolume(val);
    setMuted(val === 0);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const mediaComments = comments
    .filter(c => c.mediaId === mediaId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(mediaId, newComment, currentTime);
    setNewComment("");
  };

  const jumpToTime = (t?: number) => {
    if (t !== undefined) {
      seek(t);
      if (!playing) togglePlay();
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Video player: ${title}`}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center focus-visible:ring-inset"
      tabIndex={-1}
      onMouseMove={resetOverlayTimer}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Video element ──────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        style={{ minHeight: "80vh" }}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onWaiting={onWaiting}
        onCanPlay={onCanPlay}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        playsInline
        autoPlay
        aria-label={title}
      />

      {/* ── Buffering spinner (Req 4 AC6) ──────────────────────────────────── */}
      {buffering && !ended && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-14 w-14 text-white/80 animate-spin" aria-label="Buffering" />
        </div>
      )}

      {/* ── Title overlay (Req 4 AC10) ─────────────────────────────────────── */}
      <div
        className={`absolute top-0 inset-x-0 px-6 pt-6 pb-16 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 motion-reduce:transition-none ${showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      >
        <div className="flex items-start justify-between max-w-[1600px] mx-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">{collectionName}</p>
            <h2 className="font-display text-2xl md:text-3xl text-white text-shadow-hero">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-black/50 border border-white/20 rounded-full p-2 text-white/80 hover:text-white hover:border-white/50 transition-colors"
            aria-label="Close player"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Controls bar (Req 4 AC2/5/6) ──────────────────────────────────── */}
      <div
        className={`absolute bottom-0 inset-x-0 px-4 md:px-8 pb-6 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-500 motion-reduce:transition-none ${showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Seek bar */}
        <div className="relative mb-3 pt-12 group/seek">
          <input
            ref={seekRef as RefObject<HTMLInputElement>}
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={onSeekChange}
            className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/60 relative z-10"
            style={{
              background: `linear-gradient(to right, rgb(229, 9, 20) 0%, rgb(229, 9, 20) ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%, rgba(255, 255, 255, 0.2) 100%)`
            }}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-valuetext={formatDuration(currentTime)}
          />
        </div>

        {/* Control row */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 rounded"
            aria-label={playing ? "Pause (Space)" : "Play (Space)"}
          >
            {playing
              ? <Pause className="h-7 w-7 fill-current" />
              : <Play className="h-7 w-7 fill-current" />
            }
          </button>

          {/* Time */}
          <span className="text-xs text-white/70 tabular-nums select-none min-w-[90px]">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 rounded"
              aria-label={muted ? "Unmute (M)" : "Mute (M)"}
            >
              {muted || volume === 0
                ? <VolumeX className="h-5 w-5" />
                : <Volume2 className="h-5 w-5" />
              }
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={onVolumeChange}
              className="w-20 h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              aria-label="Volume"
            />
          </div>

          {/* Quality stub (Req 5 AC3 — UI only, no real HLS in frontend phase) */}
          <div className="relative">
            <button
              onClick={() => setShowQuality((v) => !v)}
              className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 rounded p-1"
              aria-label="Quality settings"
              aria-expanded={showQuality}
            >
              <Settings className="h-5 w-5" />
            </button>
            {showQuality && (
              <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/20 rounded-lg p-3 min-w-[140px] text-sm shadow-xl">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Quality</p>
                {["Auto", "1080p", "720p", "360p"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setShowQuality(false)}
                    className="block w-full text-left px-2 py-1.5 text-white/80 hover:text-primary hover:bg-white/10 rounded transition-colors"
                  >
                    {q === "Auto" ? "Auto (recommended)" : q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments Toggle */}
          <button
            onClick={() => { setShowComments(!showComments); resetOverlayTimer(); }}
            className={`text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 rounded ${showComments ? "text-primary" : ""}`}
            aria-label="Toggle comments"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 rounded"
            aria-label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
          >
            {fullscreen
              ? <Minimize className="h-5 w-5" />
              : <Maximize className="h-5 w-5" />
            }
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="mt-2 text-[10px] text-white/30 text-center select-none hidden md:block">
          Space · play/pause &nbsp;·&nbsp; ← → · seek 10 s &nbsp;·&nbsp; M · mute &nbsp;·&nbsp; F · fullscreen &nbsp;·&nbsp; Esc · close
        </p>
      </div>
      
      {/* ── Comments Panel (Req 15) ─────────────────────────────────────────── */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-full sm:w-80 md:w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 flex flex-col transition-transform duration-500 ease-out z-50 ${showComments ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="font-display text-xl text-white">Memories & Notes</h3>
          <button onClick={() => setShowComments(false)} className="text-white/50 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {mediaComments.length === 0 ? (
            <div className="text-center text-white/40 mt-10">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notes yet.</p>
              <p className="text-xs mt-1">Add a memory about this moment.</p>
            </div>
          ) : (
            mediaComments.map((comment) => {
              const p = profiles.find(x => x.id === comment.profileId);
              return (
                <div key={comment.id} className="flex gap-3 group/comment animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${p?.color || 'bg-gray-500'}`}>
                    {p?.name.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 bg-white/5 rounded-lg rounded-tl-none p-3 relative">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-medium text-white/80">{p?.name || 'Unknown'}</span>
                      {comment.videoTime !== undefined && (
                        <button onClick={() => jumpToTime(comment.videoTime)} className="text-[10px] text-primary hover:underline">
                          @ {formatDuration(comment.videoTime)}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                    
                    {comment.profileId === activeProfile?.id && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="absolute -top-2 -right-2 p-1.5 bg-destructive rounded-full text-white opacity-0 group-hover/comment:opacity-100 hover:scale-110 transition-all shadow-lg"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-black/50">
          <form onSubmit={handleAddComment} className="flex gap-2 relative">
            <div className="absolute left-3 top-3 text-xs text-primary/80 pointer-events-none select-none font-mono">
              {formatDuration(currentTime)}
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-white/10 border border-white/20 rounded-md py-2.5 pl-14 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="bg-primary text-primary-foreground p-3 rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors h-10 self-end"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Resume prompt (Req 4 AC8) ──────────────────────────────────────── */}
      {showResumePrompt && resumePos !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-[var(--shadow-card)]">
            <p className="font-display text-xl mb-2">Continue watching?</p>
            <p className="text-muted-foreground text-sm mb-6">
              You left off at <span className="text-primary font-medium">{formatDuration(resumePos)}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={acceptResume}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
              >
                Resume from {formatDuration(resumePos)}
              </button>
              <button
                onClick={dismissResume}
                className="bg-card/80 border border-border text-foreground px-5 py-2.5 rounded-md font-medium hover:bg-card transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End-of-video overlay (Req 4 AC7) ──────────────────────────────── */}
      {ended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10">
          <div className="text-center">
            {countdown !== null && nextVideoId ? (
              <div className="mb-12 animate-in fade-in zoom-in duration-500">
                <p className="text-white/60 mb-2 uppercase tracking-widest text-sm">Up Next in {countdown}s</p>
                <p className="font-display text-4xl md:text-5xl text-white mb-6">
                  {mediaItems.find(m => m.id === nextVideoId)?.title}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => { if (onPlayNext) onPlayNext(nextVideoId); setCountdown(null); }}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-md font-medium hover:bg-primary/90 transition-all shadow-[var(--shadow-glow)] hover:scale-105"
                  >
                    <FastForward className="h-5 w-5 fill-current" /> Play Now
                  </button>
                  <button
                    onClick={() => setCountdown(null)}
                    className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-4 rounded-md font-medium hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-12">
                <p className="font-display text-3xl md:text-4xl text-white mb-2">{title}</p>
                <p className="text-white/60 mb-8">The end.</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={replay}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-6 py-3 rounded-md font-medium hover:bg-white/20 transition-all"
                aria-label="Replay video"
              >
                <RotateCcw className="h-4 w-4" /> Replay
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-6 py-3 rounded-md font-medium hover:bg-white/20 transition-all"
                aria-label="Back to browse"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Browse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
