/**
 * Admin panel section — manage Bucket List items.
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface BucketListItem {
  id: string;
  item: string;
  emoji: string;
  completed: boolean;
  completedAt: string | null;
  sortRank: number;
}

const BLANK = { item: "", emoji: "✨", sortRank: 0 };

const EMOJI_SUGGESTIONS = ["✨", "🌟", "💫", "🎯", "🗺️", "🎒", "🏔️", "🌊", "🎨", "🎭", "🎪", "🎢"];

export function BucketListAdmin() {
  const toast = useToast();
  const [items, setItems] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<BucketListItem[]>("/bucket-list");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (i: BucketListItem) => {
    setEditingId(i.id);
    setForm({ item: i.item, emoji: i.emoji, sortRank: i.sortRank });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const save = async () => {
    if (!form.item.trim()) {
      setError("Item is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/bucket-list/${editingId}`, form);
        toast.success("Item updated!");
      } else {
        await api.post("/bucket-list", form);
        toast.success("Item added!");
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
      await api.delete(`/bucket-list/${id}`);
      toast.success("Item deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const toggleComplete = async (id: string) => {
    try {
      await api.patch(`/bucket-list/${id}/toggle`, {});
      await load();
    } catch {
      toast.error("Failed to toggle.");
    }
  };

  const dreams = items.filter((i) => !i.completed);
  const memories = items.filter((i) => i.completed);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-sm">{editingId ? "Edit Item" : "Add New Item"}</h3>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Item *</label>
            <input
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              placeholder="Visit the Northern Lights together"
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
                form.emoji === e
                  ? "bg-primary/20 border border-primary/40"
                  : "hover:bg-card border border-transparent"
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
            {saving ? (
              "Saving..."
            ) : editingId ? (
              <>
                <Check className="h-4 w-4" /> Save
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add
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
          {items.length} item{items.length !== 1 ? "s" : ""} ({memories.length} completed,{" "}
          {dreams.length} remaining)
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No items yet. Add some above.</p>
        ) : (
          <div className="space-y-4">
            {/* Dreams */}
            {dreams.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Dreams ({dreams.length})
                </h4>
                <div className="space-y-1.5">
                  {dreams.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 bg-input/40 border border-border/40 rounded-lg px-3 py-2.5"
                    >
                      <button
                        onClick={() => toggleComplete(i.id)}
                        className="shrink-0 w-5 h-5 rounded border-2 border-muted-foreground hover:border-primary transition-colors"
                        aria-label="Mark as complete"
                      />
                      <span className="text-base shrink-0">{i.emoji}</span>
                      <p className="flex-1 text-sm truncate min-w-0">{i.item}</p>
                      <button
                        onClick={() => startEdit(i)}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deleteTarget === i.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => remove(i.id)}
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
                          onClick={() => setDeleteTarget(i.id)}
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
            )}

            {/* Memories */}
            {memories.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Memories ({memories.length})
                </h4>
                <div className="space-y-1.5">
                  {memories.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 bg-green-500/5 border border-green-500/30 rounded-lg px-3 py-2.5"
                    >
                      <button
                        onClick={() => toggleComplete(i.id)}
                        className="shrink-0 w-5 h-5 rounded bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                        aria-label="Mark as incomplete"
                      >
                        <Check className="h-3.5 w-3.5 text-white" />
                      </button>
                      <span className="text-base shrink-0 opacity-60">{i.emoji}</span>
                      <p className="flex-1 text-sm truncate min-w-0 line-through opacity-60">
                        {i.item}
                      </p>
                      <button
                        onClick={() => startEdit(i)}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deleteTarget === i.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => remove(i.id)}
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
                          onClick={() => setDeleteTarget(i.id)}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
