/**
 * Admin panel section — manage Mood of the Day.
 */
import { useState, useEffect } from "react";
import { Calendar, AlertCircle, Check, Heart } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface MoodOfDay {
  id: string;
  moodDate: string;
  emoji: string;
  message: string;
  createdAt: string;
}

const EMOJI_SUGGESTIONS = ["😊", "🥰", "💕", "😍", "🤗", "😌", "✨", "💖", "🌸", "☀️", "🌙", "💫"];

export function MoodOfDayAdmin() {
  const toast = useToast();
  const [todayMood, setTodayMood] = useState<MoodOfDay | null>(null);
  const [history, setHistory] = useState<MoodOfDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState("😊");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [today, hist] = await Promise.all([
        api.get<MoodOfDay>("/mood-of-day/today").catch(() => null),
        api.get<MoodOfDay[]>("/mood-of-day"),
      ]);
      setTodayMood(today);
      setHistory(hist);
      if (today) {
        setEmoji(today.emoji);
        setMessage(today.message);
      }
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!message.trim()) { setError("Message is required."); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post("/mood-of-day", { emoji, message });
      toast.success("Today's mood updated!");
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to save.");
      toast.error(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Today's mood form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-sm">Set Today's Mood</h3>
        </div>

        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-4">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">{today}</span>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="space-y-3">
          {/* Emoji picker */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Emoji</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-2xl w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                    emoji === e ? "bg-primary/20 border-2 border-primary/40" : "hover:bg-card border-2 border-transparent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              className="w-20 bg-input border border-border rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Feeling grateful for all the little moments we share together..."
              rows={3}
              maxLength={300}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/300 characters</p>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : <><Check className="h-4 w-4" /> {todayMood ? "Update" : "Set"} Today's Mood</>}
          </button>
        </div>
      </div>

      {/* Preview */}
      {(emoji || message) && (
        <div className="bg-gradient-to-br from-primary/10 via-pink-500/10 to-purple-500/10 backdrop-blur border border-primary/30 rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
          <div className="flex items-start gap-4">
            <div className="text-5xl shrink-0">{emoji}</div>
            <div className="flex-1">
              <h4 className="font-display text-xl mb-1">Today's Mood</h4>
              <p className="text-muted-foreground">{message || "Your message will appear here..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">Recent Moods</h3>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No mood history yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {history.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-3 bg-input/40 border border-border/40 rounded-lg px-4 py-3"
              >
                <span className="text-2xl shrink-0">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(m.moodDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm">{m.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
