import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload as UploadIcon,
  ImagePlus,
  Film,
  Mic,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Plus,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import { collectionExists, createCollection } from "@/lib/admin-collections";

// ─── File size limits ─────────────────────────────────────────────────────────
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024; // 4 GB
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100 MB

const ACCEPTED_VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/3gpp",
  "video/mpeg",
];
const ACCEPTED_VIDEO_EXTS = [".mp4", ".mov", ".mkv", ".webm", ".3gp", ".mpeg", ".mpg", ".avi"];
const ACCEPTED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
];
const ACCEPTED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".avif"];
const ACCEPTED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/mp4",
  "audio/webm",
];
const ACCEPTED_AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".aac", ".m4a", ".opus"];

// ─── Magic byte detection ─────────────────────────────────────────────────────
async function detectImageFormat(file: File): Promise<string | null> {
  const buf = new Uint8Array(await file.slice(0, 24).arrayBuffer());
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "JPEG";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "PNG";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "GIF";
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "WebP";
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (["heic", "heix", "mif1"].includes(brand)) return "HEIC";
    if (["heif", "heim", "heis"].includes(brand)) return "HEIF";
    if (["avif", "avis"].includes(brand)) return "AVIF";
  }
  const ext = file.name.toLowerCase().split(".").pop();
  const extMap: Record<string, string> = {
    jpg: "JPEG",
    jpeg: "JPEG",
    png: "PNG",
    gif: "GIF",
    webp: "WebP",
    heic: "HEIC",
    heif: "HEIF",
    avif: "AVIF",
  };
  return extMap[ext || ""] || null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface UploadFile {
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  type: "image" | "video" | "voice";
}

export function QuickUploadTab() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [selectedAlbum, setSelectedAlbum] = useState("Uncategorized");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [creatingNewAlbum, setCreatingNewAlbum] = useState(false);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load collections from API
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/collections`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => setCollections([]));
  }, []);

  const createAlbum = async () => {
    const name = newAlbumName.trim();
    if (!name) return;
    if (!collectionExists(collections, name)) {
      const result = await createCollection(name);
      if (!result.ok) {
        console.error("Failed to create album:", name);
        return;
      }
      setCollections((prev) => [...prev, { id: result.id ?? `c-${Date.now()}`, name }]);
    }
    setSelectedAlbum(name);
    setCreatingNewAlbum(false);
    setNewAlbumName("");
  };

  const resolveAlbumForUpload = async (): Promise<string | null> => {
    if (creatingNewAlbum && newAlbumName.trim()) {
      const name = newAlbumName.trim();
      if (!collectionExists(collections, name)) {
        const result = await createCollection(name);
        if (!result.ok) return null;
        setCollections((prev) => [...prev, { id: result.id ?? `c-${Date.now()}`, name }]);
      }
      setSelectedAlbum(name);
      setCreatingNewAlbum(false);
      setNewAlbumName("");
      return name;
    }
    return selectedAlbum || "Uncategorized";
  };

  const addFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadFile[] = [];

    for (const file of Array.from(fileList)) {
      if (file.size === 0) {
        newFiles.push({ file, progress: 0, status: "error", error: "Empty file.", type: "image" });
        continue;
      }

      const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");

      // Detect file type
      if (ACCEPTED_VIDEO_MIMES.includes(file.type) || ACCEPTED_VIDEO_EXTS.includes(ext)) {
        if (file.size > MAX_VIDEO_SIZE) {
          newFiles.push({
            file,
            progress: 0,
            status: "error",
            error: "File exceeds 4 GB limit.",
            type: "video",
          });
          continue;
        }
        newFiles.push({ file, progress: 0, status: "pending", type: "video" });
      } else if (ACCEPTED_AUDIO_MIMES.includes(file.type) || ACCEPTED_AUDIO_EXTS.includes(ext)) {
        if (file.size > MAX_AUDIO_SIZE) {
          newFiles.push({
            file,
            progress: 0,
            status: "error",
            error: "File exceeds 100 MB limit.",
            type: "voice",
          });
          continue;
        }
        newFiles.push({ file, progress: 0, status: "pending", type: "voice" });
      } else {
        const fmt = await detectImageFormat(file);
        if (!fmt) {
          newFiles.push({
            file,
            progress: 0,
            status: "error",
            error: `Unsupported format.`,
            type: "image",
          });
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          newFiles.push({
            file,
            progress: 0,
            status: "error",
            error: "File exceeds 50 MB limit.",
            type: "image",
          });
          continue;
        }
        const preview = URL.createObjectURL(file);
        newFiles.push({ file, preview, progress: 0, status: "pending", type: "image" });
      }
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const f = prev[idx];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadFiles = async () => {
    setUploading(true);
    const pending = files.map((f, i) => ({ ...f, idx: i })).filter((f) => f.status === "pending");
    let successCount = 0;

    const albumToUse = await resolveAlbumForUpload();
    if (!albumToUse) {
      setUploading(false);
      return;
    }

    for (const pf of pending) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === pf.idx ? { ...f, status: "uploading" as const, progress: 0 } : f,
        ),
      );

      try {
        // Upload file
        const uploadData = await new Promise<{
          url: string;
          thumbnailUrl?: string;
          duration?: number;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("file", pf.file);

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setFiles((prev) => prev.map((f, i) => (i === pf.idx ? { ...f, progress } : f)));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              // Store both url and thumbnailUrl from response
              resolve(data);
            } else {
              let errMsg = `Upload failed (${xhr.status})`;
              try {
                errMsg = JSON.parse(xhr.responseText).error || errMsg;
              } catch {
                /* response body not JSON */
              }
              reject(new Error(errMsg));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

          xhr.open("POST", `${BACKEND_URL}/api/upload`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        // Auto-generate metadata and save to database
        const fileName = pf.file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const title = fileName.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words

        const mediaBody: Record<string, unknown> = {
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: pf.type === "voice" ? "voice" : pf.type === "video" ? "video" : "photo",
          title: title || "Untitled",
          year: new Date().getFullYear().toString(),
          tagline: `Uploaded on ${new Date().toLocaleDateString()}`,
          description: `Auto-uploaded ${pf.type}`,
          thumbnail: pf.type === "voice" ? undefined : uploadData.thumbnailUrl || uploadData.url,
          category: albumToUse,
          status: "ready",
        };

        if (pf.type === "video") {
          mediaBody.videoUrl = uploadData.url;
          mediaBody.photos = [];
          if (uploadData.duration) {
            mediaBody.duration = uploadData.duration;
          }
        } else if (pf.type === "voice") {
          mediaBody.audioUrl = uploadData.url;
          mediaBody.photos = [];
          if (uploadData.duration) {
            mediaBody.duration = uploadData.duration;
          }
        } else {
          // Store photos as { src, caption } objects — matches the canonical MediaItem type
          mediaBody.photos = [{ src: uploadData.url, caption: title || "Untitled" }];
        }

        await fetch(`${BACKEND_URL}/api/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(mediaBody),
        });

        setFiles((prev) =>
          prev.map((f, i) => (i === pf.idx ? { ...f, status: "done" as const, progress: 100 } : f)),
        );
        successCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f, i) =>
            i === pf.idx ? { ...f, status: "error" as const, error: message } : f,
          ),
        );
      }
    }

    setUploading(false);
    setUploadedCount(successCount);
    setUploadComplete(true);
  };

  const reset = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setUploadComplete(false);
    setUploadedCount(0);
    setSelectedAlbum("Uncategorized");
    setNewAlbumName("");
    setCreatingNewAlbum(false);
  };

  if (uploadComplete) {
    return (
      <div className="bg-card/50 border border-border/60 rounded-xl p-6 text-center py-16">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
        <h2 className="font-display text-4xl mb-3">Upload Complete!</h2>
        <p className="text-muted-foreground mb-2">
          <span className="text-foreground font-medium">
            {uploadedCount} file{uploadedCount !== 1 ? "s" : ""}
          </span>{" "}
          uploaded successfully
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Your media has been automatically organized and is ready to view
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-4 w-4" /> Upload More
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-md font-medium hover:bg-card transition-colors text-sm"
          >
            View on Website
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 border border-border/60 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">Quick Upload</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Drop your files and go! No forms to fill — we'll organize everything automatically.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Album Selection */}
        <div className="bg-card/30 border border-border/40 rounded-lg p-4">
          <label className="text-sm font-medium text-foreground/80 mb-3 block">
            Upload to Album
          </label>

          {!creatingNewAlbum ? (
            <div className="flex gap-2">
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="flex-1 bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="Uncategorized">Uncategorized</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setCreatingNewAlbum(true)}
                className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card hover:border-primary/40 transition-colors"
              >
                <Plus className="h-4 w-4" /> New Album
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createAlbum();
                }}
                placeholder="Enter new album name..."
                className="flex-1 bg-input border border-border rounded-md px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                autoFocus
              />
              <button
                onClick={createAlbum}
                disabled={!newAlbumName.trim()}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckCircle className="h-4 w-4" /> Create
              </button>
              <button
                onClick={() => {
                  setCreatingNewAlbum(false);
                  setNewAlbumName("");
                }}
                className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            {creatingNewAlbum
              ? "Create a new album and upload files to it"
              : `Files will be uploaded to "${selectedAlbum}"`}
          </p>
        </div>

        {/* Drop zone */}
        <label
          className="block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 border-primary/40 hover:border-primary hover:bg-primary/5 bg-card/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.heic,.heif,.avif,.mov,.mp4,.mkv,.webm,.3gp,.avi,.mp3,.wav,.ogg,.aac,.m4a,.opus"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="flex items-center justify-center gap-4 mb-4">
            <ImagePlus className="h-8 w-8 text-primary/70" />
            <Film className="h-8 w-8 text-primary/70" />
            <Mic className="h-8 w-8 text-primary/70" />
          </div>
          <p className="font-display text-xl text-foreground mb-2">
            Drop photos, videos, or voice notes here
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse · All formats supported · Auto-organized by type
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span>📷 Photos: Max 50 MB</span>
            <span>🎬 Videos: Max 4 GB</span>
            <span>🎤 Audio: Max 100 MB</span>
          </div>
        </label>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground/80">
                Files to Upload ({files.filter((f) => f.status !== "error").length})
              </h3>
              {!uploading && files.some((f) => f.status === "pending") && (
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${f.status === "error" ? "border-destructive/40 bg-destructive/5" : "border-border/40 bg-input/50"}`}
                >
                  {f.preview ? (
                    <img
                      src={f.preview}
                      alt=""
                      className="w-12 h-12 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                      {f.type === "voice" ? (
                        <Mic className="h-5 w-5 text-muted-foreground/40" />
                      ) : (
                        <Film className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{f.file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatSize(f.file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{f.type}</span>
                    </div>
                    {f.error && <p className="text-xs text-destructive mt-0.5">{f.error}</p>}
                    {(f.status === "uploading" || f.status === "done") && (
                      <div className="mt-1.5 h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${f.status === "done" ? "bg-primary" : "bg-primary/70"}`}
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {f.status === "uploading" && (
                      <span className="text-xs text-primary tabular-nums">{f.progress}%</span>
                    )}
                    {f.status === "done" && <CheckCircle className="h-5 w-5 text-primary" />}
                    {f.status === "uploading" && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {(f.status === "pending" || f.status === "error") && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove ${f.file.name}`}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && files.some((f) => f.status === "pending") && (
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={uploadFiles}
              disabled={uploading}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-md font-medium hover:bg-primary/90 transition-all shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Quick Upload{" "}
                  {files.filter((f) => f.status === "pending").length} File
                  {files.filter((f) => f.status === "pending").length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}

        {/* Info box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mt-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">How Quick Upload Works</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• Files are automatically titled based on filename</li>
                <li>• Media is sorted by type (photos, videos, voice notes)</li>
                <li>• Everything goes to "Uncategorized" — organize later in the Media tab</li>
                <li>• Upload date is automatically added as tagline</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
