/**
 * Admin panel section — manage Love Letters.
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface LoveLetter {
  id: string;
  from: string;
  preview: string;
  message: string;
  color: string;
  sortRank: number;
}

const COLORS = ["rose", "pink", "purple", "amber", "teal", "sky"];

const COLOR_LABELS: Record<string, string> = {
  rose: "🌹 Rose",
  pink: "🌸 Pink",
  purple: "💜 Purple",
  amber: "🌟 Amber",
  teal: "🌊 Teal",
  sky: "☁️ Sky",
};

const BLANK = { from: "", preview: "", message: "", color: "rose", sortRank: 0 };

export function LoveLettersAdmin() {
  const toast = useToast();
  const [letters, setLetters] = useState<LoveLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<LoveLetter[]>("/love-letters");
      setLetters(data);
    } catch {
      setLetters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (l: LoveLetter) => {
    setEditingId(l.id);
    setForm({
      from: l.from,
      preview: l.preview,
      message: l.message,
      color: l.color,
      sortRank: l.sortRank,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const validate = () => {
    if (!form.from.trim()) return '"From" name is required.';
    if (!form.preview.trim()) return "Preview text is required.";
    if (!form.message.trim()) return "Full message is required.";
    if (form.preview.length > 300) return "Preview must be 300 characters or fewer.";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/love-letters/${editingId}`, form);
        toast.success("Letter updated!");
      } else {
        await api.post("/love-letters", form);
        toast.success("Letter added!");
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
      await api.delete(`/love-letters/${id}`);
      toast.success("Letter deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">{editingId ? "Edit Letter" : "Add New Letter"}</h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From *</label>
            <input
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
              placeholder="e.g. Your name"
              maxLength={100}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Card Color</label>
            <select
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {COLOR_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">
            Preview (shown on card front, max 300 chars) *
          </label>
          <input
            value={form.preview}
            onChange={(e) => setForm((f) => ({ ...f, preview: e.target.value }))}
            placeholder="A short teaser shown before the card flips..."
            maxLength={300}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{form.preview.length}/300</p>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">
            Full Message (shown when card flips) *
          </label>
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Write your full love letter here..."
            rows={5}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              "Saving..."
            ) : editingId ? (
              <>
                <Check className="h-4 w-4" /> Save Changes
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Letter
              </>
            )}
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

      {/* List */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">
          {letters.length} letter{letters.length !== 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : letters.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No letters yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {letters.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 bg-input/40 border border-border/40 rounded-lg px-4 py-3"
              >
                <span className="text-lg shrink-0">💌</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">From: {l.from}</p>
                  <p className="text-xs text-muted-foreground truncate italic">"{l.preview}"</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 capitalize">{l.color}</span>
                <button
                  onClick={() => startEdit(l)}
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deleteTarget === l.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => remove(l.id)}
                      className="text-xs text-destructive hover:text-destructive/80 font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteTarget(l.id)}
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
