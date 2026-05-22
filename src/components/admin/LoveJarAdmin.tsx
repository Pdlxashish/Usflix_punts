/**
 * Admin panel section — manage Love Jar reasons.
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface JarReason {
  id: string;
  reason: string;
  emoji: string;
  sortRank: number;
}

const BLANK = { reason: "", emoji: "💕", sortRank: 0 };

// Common emoji suggestions
const EMOJI_SUGGESTIONS = ["💕", "💖", "🌹", "✨", "🥰", "💫", "🌸", "🎀", "🌙", "☀️", "🦋", "🍀"];

export function LoveJarAdmin() {
  const toast = useToast();
  const [reasons, setReasons] = useState<JarReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<JarReason[]>("/love-jar");
      setReasons(data);
    } catch {
      setReasons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (r: JarReason) => {
    setEditingId(r.id);
    setForm({ reason: r.reason, emoji: r.emoji, sortRank: r.sortRank });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const save = async () => {
    if (!form.reason.trim()) { setError("Reason is required."); return; }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/love-jar/${editingId}`, form);
        toast.success("Reason updated!");
      } else {
        await api.post("/love-jar", form);
        toast.success("Reason added!");
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
      await api.delete(`/love-jar/${id}`);
      toast.success("Reason deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  // Bulk add: one reason per line
  const saveBulk = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) { setError("Enter at least one reason."); return; }
    setBulkSaving(true);
    setError(null);
    let added = 0;
    for (const line of lines) {
      try {
        await api.post("/love-jar", { reason: line, emoji: "💕", sortRank: 0 });
        added++;
      } catch {
        // skip failures
      }
    }
    toast.success(`Added ${added} reason${added !== 1 ? "s" : ""}!`);
    setBulkText("");
    setBulkMode(false);
    setBulkSaving(false);
    await load();
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setBulkMode(false); setError(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!bulkMode ? "bg-primary text-primary-foreground" : "border border-border hover:bg-card"}`}
        >
          Single Add
        </button>
        <button
          onClick={() => { setBulkMode(true); setError(null); cancelEdit(); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${bulkMode ? "bg-primary text-primary-foreground" : "border border-border hover:bg-card"}`}
        >
          Bulk Add (one per line)
        </button>
      </div>

      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">
          {bulkMode ? "Bulk Add Reasons" : editingId ? "Edit Reason" : "Add New Reason"}
        </h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {bulkMode ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              Enter one reason per line. Great for adding 50–100 reasons at once.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"Because you laugh at my terrible jokes\nBecause you make everything feel safe\nBecause of the way you look at me..."}
              rows={10}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-3"
            />
            <button
              onClick={saveBulk}
              disabled={bulkSaving}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {bulkSaving ? "Adding..." : <><Plus className="h-4 w-4" /> Add All</>}
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Because you make every day brighter..."
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Emoji</label>
                <input
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  maxLength={4}
                  className="w-16 bg-input border border-border rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Emoji quick picks */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  className={`text-lg w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                    form.emoji === e ? "bg-primary/20 border border-primary/40" : "hover:bg-card border border-transparent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

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
          </>
        )}
      </div>

      {/* List */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">
          {reasons.length} reason{reasons.length !== 1 ? "s" : ""} in the jar
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : reasons.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No reasons yet. Add some above.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {reasons.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 bg-input/40 border border-border/40 rounded-lg px-3 py-2.5"
              >
                <span className="text-base shrink-0">{r.emoji}</span>
                <p className="flex-1 text-sm truncate min-w-0">{r.reason}</p>
                <button
                  onClick={() => startEdit(r)}
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deleteTarget === r.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => remove(r.id)} className="text-xs text-destructive font-medium">Yes</button>
                    <button onClick={() => setDeleteTarget(null)} className="text-xs text-muted-foreground">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteTarget(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
