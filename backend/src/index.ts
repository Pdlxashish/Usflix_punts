/**
 * USFLIX Backend — Express.js API Server
 * Provides REST API for auth, content management, branding, profiles, and file uploads.
 */

// Load env vars FIRST — before any other imports that read process.env at module load time
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { createServer } from "http";

import pool, { testConnection } from "./db/connection.js";
import { createTables } from "./db/schema.js";
import { seedDatabase } from "./db/seed.js";

import {
  securityHeaders,
  requestLogger,
  productionRequestLogger,
  errorHandler,
  apiLimiter,
  uploadLimiter,
  publicWriteLimiter,
  isRateLimitDisabled,
} from "./middleware/security.js";

import contentRoutes from "./routes/content.js";
import brandingRoutes from "./routes/branding.js";
import profilesRoutes from "./routes/profiles.js";
import commentsRoutes from "./routes/comments.js";
import bannersRoutes from "./routes/banners.js";
import uploadRoutes from "./routes/upload.js";
import activityRoutes from "./routes/activity.js";
import locationRoutes from "./routes/location.js";
import loveLettersRoutes from "./routes/love-letters.js";
import loveJarRoutes from "./routes/love-jar.js";
import moodBoardRoutes from "./routes/mood-board.js";
import milestonesRoutes from "./routes/milestones.js";
import quizRoutes from "./routes/quiz.js";
import bucketListRoutes from "./routes/bucket-list.js";
import moodOfDayRoutes from "./routes/mood-of-day.js";
import playlistRoutes from "./routes/playlist.js";
import greetingsRoutes from "./routes/greetings.js";
import weatherRoutes from "./routes/weather.js";
import canvasRoutes from "./routes/canvas.js";
import partnerInviteRoutes from "./routes/partner-invite.js";
import invitationRoutes from "./routes/invitations.js";
import partnerLinkingRoutes from "./routes/partner-linking.js";
import sharedMessagesRoutes from "./routes/shared-messages.js";
import sharedAlbumsRoutes from "./routes/shared-albums.js";
import coupleActivitiesRoutes from "./routes/couple-activities.js";
import liveDrawingRoutes from "./routes/live-drawing.js";
import gpsLocationRoutes from "./routes/gps-location.js";
import syncDataRoutes from "./routes/sync-data.js";
import migrateRoutes from "./routes/migrate.js";

import { initializeWebSocket } from "./websocket/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { getAllowedFrontendOrigins, validateProductionEnv } from "./config/env.js";

// Validate Clerk secret key is present in production
if (process.env.NODE_ENV === "production" && !process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY is required in production.");
}

validateProductionEnv();

const app = express();
const PORT = parseInt(process.env.PORT || "3001");
const NODE_ENV = process.env.NODE_ENV || "development";

// Trust reverse proxy in production (correct client IP for rate limiting)
if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ─── Security & Performance Middleware ────────────────────────────────────────

// Security headers
app.use(securityHeaders);

// Request logging
if (NODE_ENV === "development") {
  app.use(requestLogger);
} else {
  app.use(productionRequestLogger);
}

// Compression
app.use(compression());

// CORS — localhost + LAN over http/https (HTTPS required for phone GPS/map)
// Also allows Capacitor native app origins (capacitor://localhost, ionic://localhost)
const allowedOrigins = new Set([
  ...getAllowedFrontendOrigins(),
  "http://localhost:8080",
  "https://localhost:8080",
  "http://127.0.0.1:8080",
  "https://127.0.0.1:8080",
  "http://localhost:5173",
  "https://localhost:5173",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "ionic://localhost",
]);

const devOriginRe =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) {
        callback(null, true);
      } else if (NODE_ENV === "development" && devOriginRe.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Serve uploaded files — supports /uploads/file AND /uploads/{userId}/file
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(uploadDir), { fallthrough: true }));
// Serve per-user subdirectories dynamically
app.use("/uploads/:userId", (req, res, next) => {
  express.static(path.join(path.resolve(uploadDir), req.params.userId))(req, res, next);
});

// ─── API Routes ──────────────────────────────────────────────────────────────

if (isRateLimitDisabled()) {
  console.log("⚠️  API rate limits disabled (development / DISABLE_RATE_LIMIT=true)");
}

// Apply rate limiting to all API routes (skipped when disabled)
app.use("/api", apiLimiter);

// Upload routes with upload-specific rate limiting
app.use("/api/upload", uploadLimiter, uploadRoutes);

// Other routes
app.use("/api", contentRoutes); // /api/collections, /api/media
app.use("/api/branding", brandingRoutes);
app.use("/api/profiles", publicWriteLimiter, profilesRoutes);
app.use("/api/comments", publicWriteLimiter, commentsRoutes);
app.use("/api/banners", bannersRoutes);
app.use("/api/activity", publicWriteLimiter, activityRoutes);
app.use("/api/location", publicWriteLimiter, locationRoutes);
app.use("/api/love-letters", loveLettersRoutes);
app.use("/api/love-jar", loveJarRoutes);
app.use("/api/mood-board", moodBoardRoutes);
app.use("/api/milestones", milestonesRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/bucket-list", bucketListRoutes);
app.use("/api/mood-of-day", moodOfDayRoutes);
app.use("/api/playlist", playlistRoutes);
app.use("/api/greetings", greetingsRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/canvas", canvasRoutes);
app.use("/api/partner-invite", partnerInviteRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/partner", partnerLinkingRoutes);
app.use("/api/shared", sharedMessagesRoutes);
app.use("/api/shared", sharedAlbumsRoutes);
app.use("/api/shared", coupleActivitiesRoutes);
app.use("/api/shared", liveDrawingRoutes);
app.use("/api/location", gpsLocationRoutes);
app.use("/api/sync", syncDataRoutes);
app.use("/api/migrate", migrateRoutes);

// Health check (no rate limiting) — includes DB connectivity
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

async function start() {
  try {
    // Test database connection
    await testConnection();

    // Create tables
    await createTables();

    // Seed initial data
    await seedDatabase();

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket server
    const wss = initializeWebSocket(server);
    console.log("✅ WebSocket server initialized");

    server.listen(PORT, () => {
      console.log(`\n🚀 USFLIX Backend running on http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
      console.log(`🌐 CORS allowing: ${[...allowedOrigins].join(", ")}\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
