import { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useContent } from "@/context/content";

export function HeroBannersTab() {
  const { heroBanners, createHeroBanner, deleteHeroBanner, mediaItems } = useContent();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [type, setType] = useState<"image" | "video">("image");
  const [linkedMediaId, setLinkedMediaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file to server and get a real URL back
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setType(file.type.startsWith("video/") ? "video" : "image");
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setMediaUrl(data.url); // real server URL like /uploads/filename.jpg
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
      setPreviewUrl("");
      setMediaUrl("");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!mediaUrl) {
      setError("Please upload an image or video first.");
      return;
    }

    const res = await createHeroBanner({
      title: title.trim(),
      subtitle: subtitle.trim(),
      mediaUrl,
      type,
      linkedMediaId: linkedMediaId || undefined,
    });

    if (res.ok) {
      setTitle("");
      setSubtitle("");
      setMediaUrl("");
      setPreviewUrl("");
      setLinkedMediaId("");
      setType("image");
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setError(res.error ?? "Failed to create banner.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Create New Banner */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-4 sm:p-6">
        <h2 className="font-display text-lg sm:text-xl mb-4">Add Hero Banner</h2>
        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Banner Title *"
              maxLength={100}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Tagline / Subtitle"
              maxLength={200}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={linkedMediaId}
              onChange={(e) => setLinkedMediaId(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- No linked media (just a banner) --</option>
              {mediaItems
                .filter((m) => m.status === "ready")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    Link to: {m.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="block border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-card/60 transition-colors h-full flex flex-col justify-center items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              {uploading ? (
                <div className="flex flex-col items-center text-primary gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Uploading…</span>
                </div>
              ) : previewUrl ? (
                type === "image" ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                ) : (
                  <video src={previewUrl} className="w-full h-24 object-cover rounded mb-2" />
                )
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <div className="flex gap-2 mb-2">
                    <ImageIcon className="h-6 w-6" />
                    <Film className="h-6 w-6" />
                  </div>
                  <span className="text-sm">Click to select Image or Video *</span>
                  <span className="text-xs text-muted-foreground/60 mt-1">
                    File will be uploaded to server
                  </span>
                </div>
              )}
              {mediaUrl && !uploading && (
                <p className="text-xs text-primary mt-2">✓ Uploaded successfully</p>
              )}
            </label>
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      {/* Active Banners */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-4 sm:p-6">
        <h2 className="font-display text-lg sm:text-xl mb-4">
          Active Banners ({heroBanners.length})
        </h2>
        {heroBanners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom banners yet. The homepage will show the default layout.
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {heroBanners.map((banner) => {
              const linkedItem = banner.linkedMediaId
                ? mediaItems.find((m) => m.id === banner.linkedMediaId)
                : null;

              return (
                <div
                  key={banner.id}
                  className="group relative bg-card border border-border rounded-lg overflow-hidden flex flex-col"
                >
                  {/* Media preview */}
                  <div className="relative h-32 bg-muted shrink-0">
                    {banner.type === "image" ? (
                      <img src={banner.mediaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={banner.mediaUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    {/* Delete button */}
                    <button
                      onClick={async () => await deleteHeroBanner(banner.id)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-destructive text-white p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col relative z-10 -mt-12">
                    <p className="font-display text-lg text-white text-shadow-sm truncate">
                      {banner.title}
                    </p>
                    <p className="text-xs text-white/70 line-clamp-2 mt-0.5">{banner.subtitle}</p>

                    <div className="mt-auto pt-3">
                      {linkedItem ? (
                        <div className="inline-flex items-center gap-1.5 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          <LinkIcon className="h-3 w-3" /> Plays: {linkedItem.title}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          Display only (No link)
                        </div>
                      )}
                    </div>
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
