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

type UploadType = "image" | "video" | "voice";

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
}

export function UploadTab() {
  const [uploadType, setUploadType] = useState<UploadType>("image");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [title, setTitle] = useState("");
  const [collection, setCollection] = useState("");
  const [tagline, setTagline] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState("Uncategorized");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [creatingNewAlbum, setCreatingNewAlbum] = useState(false);
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

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles: UploadFile[] = [];

      for (const file of Array.from(fileList)) {
        if (file.size === 0) {
          newFiles.push({ file, progress: 0, status: "error", error: "Empty file." });
          continue;
        }

        const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");

        if (uploadType === "video") {
          if (!ACCEPTED_VIDEO_MIMES.includes(file.type) && !ACCEPTED_VIDEO_EXTS.includes(ext)) {
            newFiles.push({
              file,
              progress: 0,
              status: "error",
              error: `Unsupported format. Accepted: MP4, MOV, MKV, WebM, 3GP`,
            });
            continue;
          }
          if (file.size > MAX_VIDEO_SIZE) {
            newFiles.push({
              file,
              progress: 0,
              status: "error",
              error: "File exceeds 4 GB limit.",
            });
            continue;
          }
          newFiles.push({ file, progress: 0, status: "pending" });
        } else if (uploadType === "voice") {
          if (!ACCEPTED_AUDIO_MIMES.includes(file.type) && !ACCEPTED_AUDIO_EXTS.includes(ext)) {
            newFiles.push({
              file,
              progress: 0,
              status: "error",
              error: `Unsupported format. Accepted: MP3, WAV, OGG, AAC, M4A`,
            });
            continue;
          }
          if (file.size > MAX_AUDIO_SIZE) {
            newFiles.push({
              file,
              progress: 0,
              status: "error",
              error: "File exceeds 100 MB limit.",
            });
            continue;
          }
          newFiles.push({ file, progress: 0, status: "pending" });
        } else {
          const fmt = await detectImageFormat(file);
          if (!fmt) {
            newFiles.push({
              file,
              progress: 0,
              status: "error",
              error: `Unsupported format. Accepted: JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF.`,
            });
            continue;
          }
          if (file.size > MAX_IMAGE_SIZE) {
            newFiles.push({
              file,
              progress: 0,
              status: "error",
              error: "File exceeds 50 MB limit.",
            });
            continue;
          }
          const preview = URL.createObjectURL(file);
          newFiles.push({ file, preview, progress: 0, status: "pending" });
        }
      }
      setFiles((prev) => [...prev, ...newFiles].slice(0, 20));
    },
    [uploadType],
  );

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
    const uploadedUrls: string[] = [];
    let firstUploadMeta: { thumbnailUrl?: string; duration?: number } | null = null;

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

        uploadedUrls.push(uploadData.url);
        // Track thumbnailUrl and duration from the first file (video/audio)
        if (!firstUploadMeta && (uploadData.thumbnailUrl || uploadData.duration)) {
          firstUploadMeta = {
            thumbnailUrl: uploadData.thumbnailUrl,
            duration: uploadData.duration,
          };
        }
        setFiles((prev) =>
          prev.map((f, i) => (i === pf.idx ? { ...f, status: "done" as const, progress: 100 } : f)),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f, i) =>
            i === pf.idx ? { ...f, status: "error" as const, error: message } : f,
          ),
        );
      }
    }

    // Save media item to database
    if (uploadedUrls.length > 0) {
      try {
        const isVideo = uploadType === "video";
        const isVoice = uploadType === "voice";

        const mediaBody: Record<string, unknown> = {
          id: `m-${Date.now()}`,
          type: isVoice ? "voice" : isVideo ? "video" : "photo",
          title: title.trim(),
          year: new Date().getFullYear().toString(),
          tagline: tagline.trim(),
          description: tagline.trim(),
          // For videos: use the auto-generated thumbnail; for photos: use the image itself
          thumbnail: isVoice
            ? undefined
            : isVideo
              ? firstUploadMeta?.thumbnailUrl || uploadedUrls[0]
              : uploadedUrls[0],
          category: albumToUse,
          status: "ready",
        };

        if (isVideo) {
          mediaBody.videoUrl = uploadedUrls[0];
          mediaBody.photos = [];
          if (firstUploadMeta?.duration) mediaBody.duration = firstUploadMeta.duration;
        } else if (isVoice) {
          mediaBody.audioUrl = uploadedUrls[0];
          mediaBody.photos = [];
          if (firstUploadMeta?.duration) mediaBody.duration = firstUploadMeta.duration;
        } else {
          // Store photos as { src, caption } objects — matches the canonical MediaItem type
          mediaBody.photos = uploadedUrls.map((url) => ({ src: url, caption: title.trim() }));
        }

        await fetch(`${BACKEND_URL}/api/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(mediaBody),
        });
      } catch (err) {
        console.error("Failed to create media item:", err);
      }
    }

    setUploading(false);
    setSubmitted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (!tagline.trim()) errs.tagline = "Tagline is required.";
    if (files.filter((f) => f.status !== "error").length === 0)
      errs.files = "Add at least one file.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    uploadFiles();
  };

  const reset = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setTitle("");
    setCollection("");
    setTagline("");
    setFormErrors({});
    setSubmitted(false);
    setUploading(false);
    setSelectedAlbum("Uncategorized");
    setNewAlbumName("");
    setCreatingNewAlbum(false);
  };

  if (submitted) {
    const ok = files.filter((f) => f.status === "done");
    return (
      <div className="bg-card/50 border border-border/60 rounded-xl p-6 text-center py-16">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
        <h2 className="font-display text-4xl mb-3">Memory Saved!</h2>
        <p className="text-muted-foreground mb-2">
          <span className="text-foreground font-medium">"{title}"</span> is ready.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          {ok.length} file{ok.length !== 1 ? "s" : ""} · {selectedAlbum}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Add Another Memory
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

  const acceptAttr =
    uploadType === "video"
      ? "video/*,.mov,.mp4,.mkv,.webm,.3gp,.avi"
      : uploadType === "voice"
        ? "audio/*,.mp3,.wav,.ogg,.aac,.m4a,.opus"
        : "image/*,.heic,.heif,.avif";

  return (
    <div className="bg-card/50 border border-border/60 rounded-xl p-6">
      <h2 className="font-display text-xl mb-6">Upload Media</h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Upload type toggle */}
        <div
          className="flex gap-1 bg-input/50 border border-border/60 rounded-lg p-1 w-fit"
          role="group"
          aria-label="Upload type"
        >
          <button
            type="button"
            onClick={() => {
              setUploadType("image");
              setFiles([]);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${uploadType === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ImagePlus className="h-4 w-4" /> Photos
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadType("video");
              setFiles([]);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${uploadType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Film className="h-4 w-4" /> Videos
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadType("voice");
              setFiles([]);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${uploadType === "voice" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Mic className="h-4 w-4" /> Voice Note
          </button>
        </div>

        {/* Album Selection */}
        <div className="bg-card/30 border border-border/40 rounded-lg p-4">
          <label className="text-sm font-medium text-foreground/80 mb-3 block">
            Upload to Album <span className="text-primary">*</span>
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
                type="button"
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
                type="button"
                onClick={createAlbum}
                disabled={!newAlbumName.trim()}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckCircle className="h-4 w-4" /> Create
              </button>
              <button
                type="button"
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

        {/* Title + Collection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">
              Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) setFormErrors((er) => ({ ...er, title: "" }));
              }}
              placeholder="e.g. Pokhara Trip"
              className={`w-full bg-input border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${formErrors.title ? "border-destructive" : "border-border"}`}
            />
            {formErrors.title && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {formErrors.title}
              </p>
            )}
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">
            Tagline <span className="text-primary">*</span>
          </label>
          <textarea
            value={tagline}
            onChange={(e) => {
              setTagline(e.target.value);
              if (formErrors.tagline) setFormErrors((er) => ({ ...er, tagline: "" }));
            }}
            placeholder="A short caption or description…"
            rows={3}
            maxLength={200}
            className={`w-full bg-input border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm ${formErrors.tagline ? "border-destructive" : "border-border"}`}
          />
          <div className="flex justify-between">
            {formErrors.tagline ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {formErrors.tagline}
              </p>
            ) : (
              <span />
            )}
            <p className="text-xs text-muted-foreground">{tagline.length}/200</p>
          </div>
        </div>

        {/* Drop zone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">
            {uploadType === "video"
              ? "Video Files"
              : uploadType === "voice"
                ? "Audio Files"
                : "Photos"}{" "}
            <span className="text-primary">*</span>
            <span className="text-muted-foreground font-normal ml-2">
              ({files.filter((f) => f.status !== "error").length} selected)
            </span>
          </label>
          <label
            className="block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 border-border hover:border-primary/60 hover:bg-card/60 bg-card/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              multiple={uploadType !== "voice"}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            {uploadType === "video" ? (
              <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            ) : uploadType === "voice" ? (
              <Mic className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            ) : (
              <ImagePlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            )}
            <p className="font-display text-lg text-foreground">
              Drop {uploadType === "video" ? "videos" : uploadType === "voice" ? "audio" : "photos"}{" "}
              here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {uploadType === "video"
                ? "or click to browse · MP4, MOV, MKV, WebM, 3GP · Max 4 GB"
                : uploadType === "voice"
                  ? "or click to browse · MP3, WAV, OGG, AAC, M4A · Max 100 MB"
                  : "or click to browse · JPG, PNG, WebP, GIF, HEIC (iPhone) · Max 50 MB"}
            </p>
          </label>
          {formErrors.files && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {formErrors.files}
            </p>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${f.status === "error" ? "border-destructive/40 bg-destructive/5" : "border-border/40 bg-input/50"}`}
              >
                {f.preview ? (
                  <img src={f.preview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                    {uploadType === "voice" ? (
                      <Mic className="h-4 w-4 text-muted-foreground/40" />
                    ) : (
                      <Film className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
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
                  {f.status === "done" && <CheckCircle className="h-4 w-4 text-primary" />}
                  {f.status === "uploading" && (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  )}
                  {(f.status === "pending" || f.status === "error") && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${f.file.name}`}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-md font-medium hover:bg-primary/90 transition-all shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4" /> Upload Memory
              </>
            )}
          </button>
          {(files.length > 0 || title || tagline) && !uploading && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground bg-card/40 border border-border/40 rounded-md px-4 py-3 mt-4">
          Files are uploaded to the server and saved to the database. iPhone photos (HEIC) and
          videos (MOV) are supported.
        </p>
      </form>
    </div>
  );
}
