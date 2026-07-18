/**
 * File upload route — handles real file uploads via multer.
 * HEIC/HEIF images (iPhone) are auto-converted to JPEG for browser compatibility.
 * MOV videos (iPhone) are transcoded to H.264 MP4 for cross-browser playback.
 * Videos automatically generate thumbnails from the first frame.
 * Files are stored in the uploads/ directory and served statically.
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import heicConvert from "heic-convert";
import { requireAuth } from "../middleware/auth.js";
import { optionalUserAuth } from "../middleware/userAuth.js";
import { attachSpaceUserId } from "../utils/tenant.js";
import {
  generateVideoThumbnail,
  isVideoFile,
  getVideoDuration,
  convertToWebFormat,
} from "../utils/videoThumbnail.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "4294967296"); // 4GB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage — files land in UPLOAD_DIR/{userId}/ if authenticated
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.spaceUserId ?? req.auth?.userId ?? req.userAuth?.userId;
    const dir = userId
      ? path.join(UPLOAD_DIR, String(userId))
      : UPLOAD_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter — allow images, videos, and audio
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/bmp",
    "image/tiff",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/3gpp",
    "video/mpeg",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/x-m4a",
    "audio/mp4",
    "audio/webm",
    "application/octet-stream",
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".heic",
    ".heif",
    ".avif",
    ".bmp",
    ".tiff",
    ".tif",
    ".mp4",
    ".mov",
    ".webm",
    ".avi",
    ".mkv",
    ".3gp",
    ".mpeg",
    ".mpg",
    ".mp3",
    ".wav",
    ".ogg",
    ".aac",
    ".m4a",
    ".opus",
  ];
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" (${ext}) not allowed.`));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// ─── HEIC/HEIF → JPEG conversion ─────────────────────────────────────────────
const HEIC_EXTS = new Set([".heic", ".heif"]);

// ─── MOV → MP4 transcoding (for cross-browser compatibility) ─────────────────
const MOV_EXTS = new Set([".mov"]);

async function convertIfNeeded(
  file: Express.Multer.File,
  userId?: number
): Promise<{
  filename: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}> {
  const ext = path.extname(file.filename).toLowerCase();
  // Determine the actual directory this file was saved in
  const fileDir = file.destination ?? UPLOAD_DIR;
  // URL prefix based on whether it's in a user subfolder
  const urlBase = userId ? `/uploads/${userId}` : `/uploads`;

  // ── HEIC/HEIF → JPEG ──────────────────────────────────────────────────────
  if (HEIC_EXTS.has(ext)) {
    const originalPath = path.join(fileDir, file.filename);
    const jpegFilename = file.filename.replace(/\.(heic|heif)$/i, ".jpg");
    const jpegPath = path.join(fileDir, jpegFilename);

    try {
      const inputBuffer = fs.readFileSync(originalPath);
      const arrayBuffer = inputBuffer.buffer.slice(
        inputBuffer.byteOffset,
        inputBuffer.byteOffset + inputBuffer.byteLength,
      ) as ArrayBuffer;
      const outputBuffer = await heicConvert({
        buffer: arrayBuffer,
        format: "JPEG",
        quality: 0.9,
      });
      fs.writeFileSync(jpegPath, Buffer.from(outputBuffer));
      fs.unlinkSync(originalPath);
      console.log(`✅ Converted ${file.filename} → ${jpegFilename}`);
      return { filename: jpegFilename, url: `${urlBase}/${jpegFilename}` };
    } catch (err) {
      console.error(`⚠️ HEIC conversion failed for ${file.filename}:`, err);
      return { filename: file.filename, url: `${urlBase}/${file.filename}` };
    }
  }

  // ── MOV → H.264 MP4 ───────────────────────────────────────────────────────
  if (MOV_EXTS.has(ext)) {
    const movPath = path.join(fileDir, file.filename);
    const mp4Filename = file.filename.replace(/\.mov$/i, ".mp4");
    const mp4Path = path.join(fileDir, mp4Filename);
    const thumbnailFilename = mp4Filename.replace(/\.mp4$/, "-thumb.jpg");
    const thumbnailPath = path.join(fileDir, thumbnailFilename);

    let finalFilename = file.filename;
    let finalUrl = `${urlBase}/${file.filename}`;

    try {
      await convertToWebFormat(movPath, mp4Path);
      fs.unlinkSync(movPath);
      finalFilename = mp4Filename;
      finalUrl = `${urlBase}/${mp4Filename}`;
      console.log(`✅ Transcoded ${file.filename} → ${mp4Filename}`);
    } catch (err) {
      console.error(`⚠️ MOV→MP4 transcode failed:`, err);
    }

    const videoForThumb = path.join(fileDir, finalFilename);
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;

    try {
      await generateVideoThumbnail(videoForThumb, thumbnailPath, 1);
      thumbnailUrl = `${urlBase}/${thumbnailFilename}`;
    } catch (err) {
      console.error(`⚠️ Thumbnail generation failed:`, err);
    }

    try {
      duration = await getVideoDuration(videoForThumb);
    } catch {
      // Duration is optional; keep upload successful if probing fails.
    }

    return { filename: finalFilename, url: finalUrl, thumbnailUrl, duration };
  }

  // ── Other videos — thumbnail only ─────────────────────────────────────────
  if (isVideoFile(file.filename)) {
    const videoPath = path.join(fileDir, file.filename);
    const thumbnailFilename = file.filename.replace(/\.[^.]+$/, "-thumb.jpg");
    const thumbnailPath = path.join(fileDir, thumbnailFilename);

    try {
      await generateVideoThumbnail(videoPath, thumbnailPath, 1);
      let duration: number | undefined;
      try {
        duration = await getVideoDuration(videoPath);
      } catch {
        // Duration is optional; keep upload successful if probing fails.
      }
      return {
        filename: file.filename,
        url: `${urlBase}/${file.filename}`,
        thumbnailUrl: `${urlBase}/${thumbnailFilename}`,
        duration,
      };
    } catch (err) {
      console.error(`⚠️ Video thumbnail failed:`, err);
      return { filename: file.filename, url: `${urlBase}/${file.filename}` };
    }
  }

  return { filename: file.filename, url: `${urlBase}/${file.filename}` };
}

const router = Router();

/** POST /api/upload — Upload a single file (admin or authenticated user) */
router.post("/", optionalUserAuth, attachSpaceUserId, upload.single("file"), async (req: Request, res: Response) => {
  const userId = req.spaceUserId ?? req.auth?.userId ?? req.userAuth?.userId;
  if (!userId) {
    res.status(401).json({ ok: false, error: "Authentication required" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ ok: false, error: "No file uploaded" });
    return;
  }
  try {
    const { filename, url, thumbnailUrl, duration } = await convertIfNeeded(req.file, userId);
    res.json({ ok: true, url, filename, thumbnailUrl, duration,
      originalName: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload processing failed";
    res.status(500).json({ ok: false, error: message });
  }
});

/** POST /api/upload/multiple — Upload multiple files (authenticated) */
router.post("/multiple", requireAuth, attachSpaceUserId, upload.array("files", 20), async (req: Request, res: Response) => {
  const userId = req.spaceUserId ?? req.auth?.userId ?? req.userAuth?.userId;
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ ok: false, error: "No files uploaded" });
    return;
  }
  try {
    const results = await Promise.all(
      files.map(async (f) => {
        const { filename, url, thumbnailUrl, duration } = await convertIfNeeded(f, userId);
        return { url, filename, thumbnailUrl, duration,
          originalName: f.originalname, size: f.size, mimetype: f.mimetype };
      }),
    );
    res.json({ ok: true, files: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload processing failed";
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;
