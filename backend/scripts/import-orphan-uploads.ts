/**
 * Import orphan files from uploads/{userId}/ into media_items.
 * Skips demo seed entries and files already referenced in the DB.
 *
 * Usage: npm run migrate:import-uploads
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pool from "../src/db/connection.js";

dotenv.config();

const TARGET_EMAIL = "poudelashish0718@gmail.com";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const VOICE_EXT = new Set([".m4a", ".mp3", ".wav", ".ogg", ".aac", ".opus"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp"]);

function detectType(ext: string): "photo" | "video" | "voice" | null {
  if (VOICE_EXT.has(ext)) return "voice";
  if (VIDEO_EXT.has(ext)) return "video";
  if (IMAGE_EXT.has(ext)) return "photo";
  return null;
}

function titleFromFilename(filename: string): string {
  const ts = parseInt(filename.split("-")[0], 10);
  if (!Number.isNaN(ts) && ts > 1_000_000_000_000) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const base = path.basename(filename, path.extname(filename));
  return base.slice(0, 40);
}

function yearFromFilename(filename: string): string {
  const ts = parseInt(filename.split("-")[0], 10);
  if (!Number.isNaN(ts) && ts > 1_000_000_000_000) {
    return new Date(ts).getFullYear().toString();
  }
  return new Date().getFullYear().toString();
}

async function collectReferencedUrls(userId: number): Promise<Set<string>> {
  const refs = new Set<string>();
  const { rows: media } = await pool.query(
    `SELECT thumbnail, video_url, audio_url, photos FROM media_items WHERE user_id = $1`,
    [userId]
  );
  for (const row of media) {
    for (const field of [row.thumbnail, row.video_url, row.audio_url]) {
      if (field) refs.add(field);
    }
    if (row.photos) {
      const photos = typeof row.photos === "string" ? JSON.parse(row.photos) : row.photos;
      for (const p of photos) {
        if (p?.src) refs.add(p.src);
      }
    }
  }
  const tables = [
    ["hero_banners", "media_url"],
    ["branding", "logo_url"],
    ["branding", "favicon_url"],
    ["branding", "background_image_url"],
    ["branding", "profile_picture_url"],
    ["profiles", "profile_picture_url"],
    ["mood_board", "image_url"],
    ["milestones", "image_url"],
    ["canvas_drawings", "thumbnail_url"],
  ] as const;
  for (const [table, col] of tables) {
    try {
      const { rows } = await pool.query(
        `SELECT ${col} AS url FROM ${table} WHERE ${table === "branding" ? "user_id" : table === "profiles" ? "user_id" : "user_id"} = $1 AND ${col} IS NOT NULL`,
        [userId]
      );
      for (const r of rows) if (r.url) refs.add(r.url);
    } catch {
      /* table may use profile_id not user_id — skip */
    }
  }
  return refs;
}

async function importUploads() {
  const email = TARGET_EMAIL.toLowerCase();
  const { rows: users } = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [email]
  );
  if (users.length === 0) throw new Error(`User not found: ${email}`);
  const userId: number = users[0].id;
  const tenantPath = path.join(UPLOAD_DIR, String(userId));

  if (!fs.existsSync(tenantPath)) {
    throw new Error(`Upload folder missing: ${tenantPath}`);
  }

  const client = await pool.connect();
  const stats = { photos: 0, videos: 0, voice: 0, skipped: 0, demoRemoved: 0 };

  try {
    await client.query("BEGIN");

    // Remove demo seed media (static /assets/ and sample videos)
    const demoDelete = await client.query(
      `DELETE FROM media_items
       WHERE user_id = $1
         AND (
           thumbnail LIKE '/assets/%'
           OR video_url LIKE 'https://%'
           OR photos::text LIKE '%/assets/%'
         )`,
      [userId]
    );
    stats.demoRemoved = demoDelete.rowCount ?? 0;

    const refs = await collectReferencedUrls(userId);
    const allFiles = fs.readdirSync(tenantPath).filter((f) => {
      const full = path.join(tenantPath, f);
      return fs.statSync(full).isFile();
    });

    const thumbSet = new Set(
      allFiles.filter((f) => f.includes("-thumb.")).map((f) => f)
    );

    let sortRank = 1;
    const collections = new Map<string, string>();

    async function ensureCollection(name: string): Promise<string> {
      if (collections.has(name)) return collections.get(name)!;
      const id = `col-${name.toLowerCase().replace(/\s+/g, "-")}-${userId}`;
      await client.query(
        `INSERT INTO collections (id, user_id, name, description, sort_rank)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, name, `Recovered ${name}`, sortRank]
      );
      collections.set(name, id);
      return id;
    }

    for (const filename of allFiles.sort()) {
      if (filename.includes("-thumb.")) {
        stats.skipped++;
        continue;
      }

      const ext = path.extname(filename).toLowerCase();
      const mediaType = detectType(ext);
      if (!mediaType) {
        stats.skipped++;
        continue;
      }

      const url = `/uploads/${userId}/${filename}`;
      if (refs.has(url)) {
        stats.skipped++;
        continue;
      }

      const title = titleFromFilename(filename);
      const year = yearFromFilename(filename);
      const mediaId = `import-${filename.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 80)}`;

      let category = "Photos";
      let thumbnail: string | null = url;
      let videoUrl: string | null = null;
      let audioUrl: string | null = null;
      let photos: object[] = [];

      if (mediaType === "voice") {
        category = "Voice Notes";
        audioUrl = url;
        thumbnail = null;
        stats.voice++;
      } else if (mediaType === "video") {
        category = "Videos";
        videoUrl = url;
        const thumbName = filename.replace(/\.[^.]+$/, "-thumb.jpg");
        if (thumbSet.has(thumbName)) {
          thumbnail = `/uploads/${userId}/${thumbName}`;
        }
        stats.videos++;
      } else {
        category = "Photos";
        photos = [{ src: url, caption: title }];
        stats.photos++;
      }

      await ensureCollection(category);

      await client.query(
        `INSERT INTO media_items (
          id, user_id, type, title, year, tagline, description,
          thumbnail, category, sort_rank, video_url, audio_url, photos, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ready')
        ON CONFLICT (id) DO NOTHING`,
        [
          mediaId,
          userId,
          mediaType,
          title,
          year,
          "Recovered upload",
          "",
          thumbnail,
          category,
          sortRank++,
          videoUrl,
          audioUrl,
          JSON.stringify(photos),
        ]
      );
    }

    // Point hero banner at first photo if still using demo asset
    const { rows: banners } = await client.query(
      `SELECT id, media_url FROM hero_banners WHERE user_id = $1`,
      [userId]
    );
    if (banners.length > 0 && banners[0].media_url?.startsWith("/assets/")) {
      const { rows: firstPhoto } = await client.query(
        `SELECT thumbnail FROM media_items
         WHERE user_id = $1 AND type = 'photo' AND thumbnail LIKE '/uploads/%'
         ORDER BY sort_rank ASC LIMIT 1`,
        [userId]
      );
      if (firstPhoto.length > 0) {
        await client.query(`UPDATE hero_banners SET media_url = $2 WHERE id = $1`, [
          banners[0].id,
          firstPhoto[0].thumbnail,
        ]);
      }
    }

    await client.query("COMMIT");

    console.log("\n✅ Import complete for", email, `(user_id=${userId})`);
    console.log(`   Demo items removed: ${stats.demoRemoved}`);
    console.log(`   Photos imported:    ${stats.photos}`);
    console.log(`   Videos imported:    ${stats.videos}`);
    console.log(`   Voice imported:     ${stats.voice}`);
    console.log(`   Skipped (thumbs):   ${stats.skipped}`);
    console.log("\n   Sign in and refresh the dashboard to see your memories.\n");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importUploads().catch((err) => {
  console.error("❌ Import failed:", err.message || err);
  process.exit(1);
});
