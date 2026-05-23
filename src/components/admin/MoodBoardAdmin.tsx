/**
 * Admin panel section — manage Mood Board photos.
 */
import { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, Upload, Image } from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { uploadAdminFile } from "@/lib/admin-upload";
import { useToast } from "@/components/ui/Toast";

interface MoodPhoto {
  id: string;
  imageUrl: string;
  alt: string;
  sortRank: number;
}

export function MoodBoardAdmin() {
  const toast = useToast();
  const [photos, setPhotos] = useState<MoodPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<MoodPhoto[]>("/mood-board");
      setPhotos(data);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadAdminFile(file);
        await api.post("/mood-board", { imageUrl: uploaded.url, alt: "", sortRank: 0 });
        added++;
      } catch (e: any) {
        setError(e.message || "Failed to upload one or more photos.");
      }
    }
    if (added > 0) toast.success(`Added ${added} photo${added !== 1 ? "s" : ""}!`);
    setUploading(false);
    await load();
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/mood-board/${id}`);
      toast.success("Photo removed.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">Add Photos to Mood Board</h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/60 rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-card/30 transition-all">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload photos"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Select multiple photos at once</p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {/* Grid */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">
          {photos.length} photo{photos.length !== 1 ? "s" : ""} on the mood board
        </p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground italic">
              No photos yet. Upload some above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative group aspect-square rounded-xl overflow-hidden border border-border/40"
              >
                <img
                  src={getMediaUrl(p.imageUrl)}
                  alt={p.alt || "Mood board photo"}
                  className="w-full h-full object-cover"
                />
                {/* Delete overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  {deleteTarget === p.id ? (
                    <div className="flex flex-col gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white font-medium">Delete?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => remove(p.id)}
                          className="text-xs bg-destructive text-white px-2 py-1 rounded"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="text-xs bg-white/20 text-white px-2 py-1 rounded"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 hover:bg-destructive text-white rounded-full p-2"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
