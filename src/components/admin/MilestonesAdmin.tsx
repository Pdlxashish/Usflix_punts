/**
 * Admin panel section — manage "First Time We..." milestones.
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check, Upload } from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { uploadAdminFile } from "@/lib/admin-upload";
import { useToast } from "@/components/ui/Toast";

interface Milestone {
  id: string;
  title: string;
  story: string;
  date: string;
  imageUrl: string;
  emoji: string;
}

const BLANK = { title: "", story: "", date: "", imageUrl: "", emoji: "💕" };

const EMOJI_SUGGESTIONS = [
  "💕",
  "💑",
  "🌹",
  "✈️",
  "🎬",
  "🍕",
  "🎉",
  "🌅",
  "💍",
  "🏠",
  "🐾",
  "🎵",
  "🌊",
  "⛰️",
  "🎂",
  "🥂",
  "🌙",
  "☀️",
  "🤝",
  "👋",
];

export function MilestonesAdmin() {
  const toast = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<Milestone[]>("/milestones");
      setMilestones(data);
    } catch {
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (m: Milestone) => {
    setEditingId(m.id);
    // Format date for input[type=date]
    const dateVal = m.date ? new Date(m.date).toISOString().split("T")[0] : "";
    setForm({
      title: m.title,
      story: m.story,
      date: dateVal,
      imageUrl: m.imageUrl,
      emoji: m.emoji,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadAdminFile(file);
      setForm((f) => ({ ...f, imageUrl: uploaded.url }));
      toast.success("Photo uploaded!");
    } catch (e: any) {
      setError(e.message || "Failed to upload photo.");
      toast.error(e.message || "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.date.trim()) return "Date is required.";
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
      const payload = { ...form };
      if (editingId) {
        await api.put(`/milestones/${editingId}`, payload);
        toast.success("Milestone updated!");
      } else {
        await api.post("/milestones", payload);
        toast.success("Milestone added!");
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
      await api.delete(`/milestones/${id}`);
      toast.success("Milestone deleted.");
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
        <h3 className="font-medium text-sm mb-4">
          {editingId ? "Edit Milestone" : "Add New Milestone"}
        </h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Title * (e.g. "First Date")
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="First time we met"
              maxLength={200}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Emoji */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">Emoji</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              maxLength={4}
              className="w-14 bg-input border border-border rounded-md px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
        </div>

        {/* Story */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">Story (optional)</label>
          <textarea
            value={form.story}
            onChange={(e) => setForm((f) => ({ ...f, story: e.target.value }))}
            placeholder="Tell the story of this moment..."
            rows={3}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Photo upload */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Photo (optional)</label>
          <label className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-md text-sm hover:bg-card hover:border-primary/40 transition-colors cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload Photo"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
              className="hidden"
            />
          </label>
          {form.imageUrl && (
            <div className="mt-2 relative inline-block">
              <img
                src={getMediaUrl(form.imageUrl)}
                alt="Preview"
                className="h-20 w-32 object-cover rounded-lg border border-border/40"
              />
              <button
                onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving || uploading}
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
                <Plus className="h-4 w-4" /> Add Milestone
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
          {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No milestones yet. Add your first one above.
          </p>
        ) : (
          <div className="space-y-2">
            {milestones.map((m) => {
              const dateLabel = m.date
                ? new Date(m.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 bg-input/40 border border-border/40 rounded-lg px-4 py-3"
                >
                  <span className="text-xl shrink-0">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                  </div>
                  {m.imageUrl && (
                    <img
                      src={getMediaUrl(m.imageUrl)}
                      alt=""
                      className="w-10 h-10 rounded-md object-cover shrink-0 border border-border/40"
                    />
                  )}
                  <button
                    onClick={() => startEdit(m)}
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {deleteTarget === m.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => remove(m.id)}
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
                      onClick={() => setDeleteTarget(m.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
