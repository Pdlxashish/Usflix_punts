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

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
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

async function convertIfNeeded(file: Express.Multer.File): Promise<{
  filename: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}> {
  const ext = path.extname(file.filename).toLowerCase();

  // ── HEIC/HEIF → JPEG ──────────────────────────────────────────────────────
  if (HEIC_EXTS.has(ext)) {
    const originalPath = path.join(UPLOAD_DIR, file.filename);
    const jpegFilename = file.filename.replace(/\.(heic|heif)$/i, ".jpg");
    const jpegPath = path.join(UPLOAD_DIR, jpegFilename);

    try {
      const inputBuffer = fs.readFileSync(originalPath);
      // Copy into a fresh ArrayBuffer — Node's Buffer.buffer is a shared
      // backing store that heic-decode cannot iterate over correctly.
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
      fs.unlinkSync(originalPath); // remove original HEIC
      console.log(`✅ Converted ${file.filename} → ${jpegFilename}`);
      return { filename: jpegFilename, url: `/uploads/${jpegFilename}` };
    } catch (err) {
      console.error(`⚠️ HEIC conversion failed for ${file.filename}:`, err);
      // Serve original as fallback
      return { filename: file.filename, url: `/uploads/${file.filename}` };
    }
  }

  // ── MOV → H.264 MP4 (cross-browser) ──────────────────────────────────────
  if (MOV_EXTS.has(ext)) {
    const movPath = path.join(UPLOAD_DIR, file.filename);
    const mp4Filename = file.filename.replace(/\.mov$/i, ".mp4");
    const mp4Path = path.join(UPLOAD_DIR, mp4Filename);
    const thumbnailFilename = mp4Filename.replace(/\.mp4$/, "-thumb.jpg");
    const thumbnailPath = path.join(UPLOAD_DIR, thumbnailFilename);

    let finalFilename = file.filename;
    let finalUrl = `/uploads/${file.filename}`;

    // Transcode MOV → MP4
    try {
      await convertToWebFormat(movPath, mp4Path);
      fs.unlinkSync(movPath); // remove original MOV after successful transcode
      finalFilename = mp4Filename;
      finalUrl = `/uploads/${mp4Filename}`;
      console.log(`✅ Transcoded ${file.filename} → ${mp4Filename}`);
    } catch (err) {
      console.error(`⚠️ MOV→MP4 transcode failed for ${file.filename}, serving original:`, err);
      // Keep original MOV as fallback — Safari can still play it
    }

    // Generate thumbnail from the final video file
    const videoForThumb = path.join(UPLOAD_DIR, finalFilename);
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;

    try {
      await generateVideoThumbnail(videoForThumb, thumbnailPath, 1);
      thumbnailUrl = `/uploads/${thumbnailFilename}`;
      console.log(`✅ Generated thumbnail for MOV/MP4: ${thumbnailFilename}`);
    } catch (err) {
      console.error(`⚠️ Thumbnail generation failed for ${finalFilename}:`, err);
    }

    try {
      duration = await getVideoDuration(videoForThumb);
    } catch (err) {
      console.warn(`⚠️ Could not get video duration for ${finalFilename}:`, err);
    }

    return { filename: finalFilename, url: finalUrl, thumbnailUrl, duration };
  }

  // ── Other video formats — thumbnail only ──────────────────────────────────
  if (isVideoFile(file.filename)) {
    const videoPath = path.join(UPLOAD_DIR, file.filename);
    const thumbnailFilename = file.filename.replace(/\.[^.]+$/, "-thumb.jpg");
    const thumbnailPath = path.join(UPLOAD_DIR, thumbnailFilename);

    try {
      // Generate thumbnail from video (at 1 second mark)
      await generateVideoThumbnail(videoPath, thumbnailPath, 1);

      // Get video duration
      let duration: number | undefined;
      try {
        duration = await getVideoDuration(videoPath);
      } catch (err) {
        console.warn(`⚠️ Could not get video duration:`, err);
      }

      console.log(`✅ Generated thumbnail for video: ${thumbnailFilename}`);
      return {
        filename: file.filename,
        url: `/uploads/${file.filename}`,
        thumbnailUrl: `/uploads/${thumbnailFilename}`,
        duration,
      };
    } catch (err) {
      console.error(`⚠️ Video thumbnail generation failed for ${file.filename}:`, err);
      // Return video without thumbnail as fallback
      return { filename: file.filename, url: `/uploads/${file.filename}` };
    }
  }

  return { filename: file.filename, url: `/uploads/${file.filename}` };
}

const router = Router();

/** POST /api/upload — Upload a single file (admin only) */
router.post("/", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: "No file uploaded" });
    return;
  }
  try {
    const { filename, url, thumbnailUrl, duration } = await convertIfNeeded(req.file);
    res.json({
      ok: true,
      url,
      filename,
      thumbnailUrl,
      duration,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload processing failed";
    res.status(500).json({ ok: false, error: message });
  }
});

/** POST /api/upload/multiple — Upload multiple files (admin only) */
router.post(
  "/multiple",
  requireAuth,
  upload.array("files", 20),
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ ok: false, error: "No files uploaded" });
      return;
    }
    try {
      const results = await Promise.all(
        files.map(async (f) => {
          const { filename, url, thumbnailUrl, duration } = await convertIfNeeded(f);
          return {
            url,
            filename,
            thumbnailUrl,
            duration,
            originalName: f.originalname,
            size: f.size,
            mimetype: f.mimetype,
          };
        }),
      );
      res.json({ ok: true, files: results });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload processing failed";
      res.status(500).json({ ok: false, error: message });
    }
  },
);

export default router;
