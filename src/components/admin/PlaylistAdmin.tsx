/**
 * Admin panel — manage playlist songs
 */
import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Check,
  Music,
  Heart,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Song {
  id: string;
  title: string;
  artist: string;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  memoryNote: string;
  isOurSong: boolean;
  isSongOfDay: boolean;
  sortRank: number;
}

const BLANK = {
  title: "",
  artist: "",
  spotifyUrl: "",
  youtubeUrl: "",
  memoryNote: "",
  sortRank: 0,
};

export function PlaylistAdmin() {
  const toast = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<Song[]>("/playlist");
      setSongs(data);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (s: Song) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      artist: s.artist,
      spotifyUrl: s.spotifyUrl || "",
      youtubeUrl: s.youtubeUrl || "",
      memoryNote: s.memoryNote,
      sortRank: s.sortRank,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/playlist/${editingId}`, form);
        toast.success("Song updated!");
      } else {
        await api.post("/playlist", form);
        toast.success("Song added!");
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
      await api.delete(`/playlist/${id}`);
      toast.success("Song deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const setOurSong = async (id: string) => {
    try {
      await api.patch(`/playlist/${id}/set-our-song`, {});
      toast.success("Set as 'Our Song'!");
      await load();
    } catch {
      toast.error("Failed to set our song.");
    }
  };

  const setSongOfDay = async (id: string) => {
    try {
      await api.patch(`/playlist/${id}/set-song-of-day`, {});
      toast.success("Set as 'Song of the Day'!");
      await load();
    } catch {
      toast.error("Failed to set song of the day.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">{editingId ? "Edit Song" : "Add New Song"}</h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="space-y-3">
          {/* Title & Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Song Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Perfect"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Artist</label>
              <input
                value={form.artist}
                onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
                placeholder="Ed Sheeran"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* URLs */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Spotify URL</label>
            <input
              value={form.spotifyUrl}
              onChange={(e) => setForm((f) => ({ ...f, spotifyUrl: e.target.value }))}
              placeholder="https://open.spotify.com/track/..."
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste the full Spotify track URL (will auto-embed)
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">YouTube URL</label>
            <input
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste the full YouTube video URL (will auto-embed)
            </p>
          </div>

          {/* Memory note */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Memory Note</label>
            <textarea
              value={form.memoryNote}
              onChange={(e) => setForm((f) => ({ ...f, memoryNote: e.target.value }))}
              placeholder="This was playing when we first met..."
              rows={2}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
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
          {songs.length} song{songs.length !== 1 ? "s" : ""} in playlist
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : songs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No songs yet. Add your first song above.
          </p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {songs.map((s) => (
              <div
                key={s.id}
                className={`bg-input/40 border rounded-lg p-3 ${
                  s.isOurSong
                    ? "border-primary/40"
                    : s.isSongOfDay
                      ? "border-accent/40"
                      : "border-border/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Music className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        {s.artist && (
                          <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {s.isOurSong && (
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                            <Heart className="h-3 w-3 fill-current" /> Our Song
                          </span>
                        )}
                        {s.isSongOfDay && (
                          <span className="inline-flex items-center gap-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                            <Sparkles className="h-3 w-3" /> Today
                          </span>
                        )}
                      </div>
                    </div>
                    {s.memoryNote && (
                      <p className="text-xs text-muted-foreground italic mb-2">"{s.memoryNote}"</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {s.spotifyUrl && (
                        <a
                          href={s.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Spotify
                        </a>
                      )}
                      {s.youtubeUrl && (
                        <a
                          href={s.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> YouTube
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setOurSong(s.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Set as Our Song"
                    >
                      <Heart className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSongOfDay(s.id)}
                      className="text-muted-foreground hover:text-accent transition-colors"
                      title="Set as Song of the Day"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => startEdit(s)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {deleteTarget === s.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => remove(s.id)}
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
                        onClick={() => setDeleteTarget(s.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
