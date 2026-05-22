/**
 * Admin panel — manage time-based greetings
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check, Sun, Cloud, Sunset, Moon } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Greeting {
  id: string;
  timeOfDay: string;
  message: string;
  isActive: boolean;
  sortRank: number;
}

const BLANK = { timeOfDay: "morning", message: "", isActive: true, sortRank: 0 };

const TIME_OPTIONS = [
  { value: "morning", label: "Morning (5am-12pm)", icon: Sun, color: "text-amber-500" },
  { value: "afternoon", label: "Afternoon (12pm-5pm)", icon: Cloud, color: "text-sky-500" },
  { value: "evening", label: "Evening (5pm-9pm)", icon: Sunset, color: "text-orange-500" },
  { value: "night", label: "Night (9pm-5am)", icon: Moon, color: "text-indigo-500" },
];

const GREETING_SUGGESTIONS = {
  morning: [
    "Good morning, sunshine! ☀️",
    "Rise and shine, beautiful! 💕",
    "Morning, my love! Hope you slept well 🌅",
  ],
  afternoon: [
    "Hope you're having a wonderful afternoon! 💕",
    "Afternoon, gorgeous! 🌤️",
    "Thinking of you this afternoon 💭",
  ],
  evening: [
    "Good evening, beautiful! 🌅",
    "Evening, my love! How was your day? 💕",
    "The evening is better with you 🌆",
  ],
  night: [
    "Sweet dreams, my love! 🌙",
    "Good night, beautiful! Sleep tight 💕",
    "Dream of us tonight 🌟",
  ],
};

export function GreetingsAdmin() {
  const toast = useToast();
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("morning");

  const load = async () => {
    try {
      const data = await api.get<Greeting[]>("/greetings");
      setGreetings(data);
    } catch {
      setGreetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (g: Greeting) => {
    setEditingId(g.id);
    setForm({
      timeOfDay: g.timeOfDay,
      message: g.message,
      isActive: g.isActive,
      sortRank: g.sortRank,
    });
    setSelectedTime(g.timeOfDay);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setSelectedTime("morning");
    setError(null);
  };

  const save = async () => {
    if (!form.message.trim()) {
      setError("Message is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/greetings/${editingId}`, form);
        toast.success("Greeting updated!");
      } else {
        await api.post("/greetings", form);
        toast.success("Greeting added!");
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to save.");
      toast.error(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/greetings/${id}`);
      toast.success("Greeting deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const useSuggestion = (msg: string) => {
    setForm((f) => ({ ...f, message: msg }));
  };

  // Group greetings by time of day
  const groupedGreetings = TIME_OPTIONS.map((time) => ({
    ...time,
    greetings: greetings.filter((g) => g.timeOfDay === time.value),
  }));

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">
          {editingId ? "Edit Greeting" : "Add New Greeting"}
        </h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {/* Time of day selector */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-2 block">Time of Day *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIME_OPTIONS.map((time) => {
              const Icon = time.icon;
              const isSelected = form.timeOfDay === time.value;
              return (
                <button
                  key={time.value}
                  onClick={() => {
                    setForm((f) => ({ ...f, timeOfDay: time.value }));
                    setSelectedTime(time.value);
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary/40"
                      : "border-border hover:bg-card"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? time.color : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium capitalize">{time.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message input */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Good morning, sunshine! ☀️"
            rows={3}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Suggestions */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {GREETING_SUGGESTIONS[selectedTime as keyof typeof GREETING_SUGGESTIONS].map((msg, i) => (
              <button
                key={i}
                onClick={() => useSuggestion(msg)}
                className="text-xs px-3 py-1.5 rounded-md bg-input hover:bg-card border border-border transition-colors"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm">Active (show this greeting)</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? <><Check className="h-4 w-4" /> Save</> : <><Plus className="h-4 w-4" /> Add</>}
          </button>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 border border-border px-5 py-2.5 rounded-md text-sm hover:bg-card transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* List grouped by time */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">
          {greetings.length} greeting{greetings.length !== 1 ? "s" : ""} configured
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : greetings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No greetings yet. Add some above to customize messages for different times of day.
          </p>
        ) : (
          <div className="space-y-4">
            {groupedGreetings.map((group) => {
              if (group.greetings.length === 0) return null;
              const Icon = group.icon;
              return (
                <div key={group.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${group.color}`} />
                    <h4 className="text-sm font-medium capitalize">{group.label}</h4>
                    <span className="text-xs text-muted-foreground">
                      ({group.greetings.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {group.greetings.map((g) => (
                      <div
                        key={g.id}
                        className={`flex items-center gap-3 bg-input/40 border rounded-lg px-3 py-2.5 ${
                          g.isActive ? "border-border/40" : "border-border/20 opacity-50"
                        }`}
                      >
                        <p className="flex-1 text-sm min-w-0">{g.message}</p>
                        {!g.isActive && (
                          <span className="text-xs text-muted-foreground shrink-0">Inactive</span>
                        )}
                        <button
                          onClick={() => startEdit(g)}
                          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deleteTarget === g.id ? (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => remove(g.id)}
                              className="text-xs text-destructive font-medium"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteTarget(null)}
                              className="text-xs text-muted-foreground"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteTarget(g.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
