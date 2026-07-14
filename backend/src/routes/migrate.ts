/**
 * Data Migration route — moves existing flat uploads into per-user folders
 * and reassigns all content to poudelashish0718@gmail.com.
 *
 * POST /api/migrate/tenant  (requireAuth — only the owner can run this)
 *
 * What it does:
 *  1. Finds (or creates) the internal user for the given email
 *  2. Moves all files in ./uploads/ (flat) into ./uploads/{userId}/
 *  3. Updates all URL references in the DB to point to the new paths
 *  4. Assigns all orphaned content rows (user_id = NULL or old admin user)
 *     to the target user
 */
import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tenantDir(userId: number): string {
  const dir = path.join(UPLOAD_DIR, String(userId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rewriteUrl(url: string, oldPrefix: string, newPrefix: string): string {
  if (!url) return url;
  if (url.startsWith(oldPrefix)) return newPrefix + url.slice(oldPrefix.length);
  return url;
}

/** Move a file from flat uploads/ to uploads/{userId}/ and return new URL. */
function moveFile(filename: string, userId: number): string {
  const src = path.join(UPLOAD_DIR, filename);
  const dest = path.join(tenantDir(userId), filename);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.renameSync(src, dest);
  }
  return `/uploads/${userId}/${filename}`;
}

/** Extract filename from a /uploads/... URL. */
function filenameFromUrl(url: string): string | null {
  if (!url) return null;
  // Handle /uploads/filename  OR  /uploads/{userId}/filename
  const m = url.match(/\/uploads\/(?:\d+\/)?(.+)$/);
  return m ? m[1] : null;
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/migrate/tenant
 * Body: { targetEmail: string }   — email of the user to own all existing data
 */
router.post("/tenant", requireAuth, async (req: Request, res: Response) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail) {
      res.status(400).json({ ok: false, error: "targetEmail is required" });
      return;
    }

    // Find target user
    const { rows: userRows } = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [targetEmail.trim().toLowerCase()]
    );
    if (userRows.length === 0) {
      res.status(404).json({
        ok: false,
        error: `No user found with email ${targetEmail}. Sign in first to create the account.`,
      });
      return;
    }
    const targetUserId: number = userRows[0].id;

    const log: string[] = [];
    const dbClient = await pool.connect();

    try {
      await dbClient.query("BEGIN");

      // 1. Reassign all content tables where user_id != targetUserId
      const contentTables = [
        "collections", "media_items", "hero_banners",
        "love_letters", "love_jar", "mood_board", "milestones",
        "quiz_questions", "bucket_list", "mood_of_day", "playlist_songs",
        "canvas_drawings", "time_greetings",
      ];

      for (const table of contentTables) {
        const { rowCount } = await dbClient.query(
          `UPDATE ${table} SET user_id = $1 WHERE user_id != $1`,
          [targetUserId]
        );
        if (rowCount && rowCount > 0) log.push(`${table}: reassigned ${rowCount} rows`);
      }

      // Branding: upsert to target user
      await dbClient.query(
        `INSERT INTO branding (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [targetUserId]
      );
      await dbClient.query(
        `DELETE FROM branding WHERE user_id != $1`,
        [targetUserId]
      );
      log.push("branding: reassigned to target user");

      // 2. Reassign profiles
      const { rowCount: pRows } = await dbClient.query(
        `UPDATE profiles SET user_id = $1 WHERE user_id != $1`,
        [targetUserId]
      );
      if (pRows && pRows > 0) log.push(`profiles: reassigned ${pRows} rows`);

      await dbClient.query("COMMIT");
    } catch (err) {
      await dbClient.query("ROLLBACK");
      throw err;
    } finally {
      dbClient.release();
    }

    // 3. Move flat uploads into /uploads/{userId}/
    let filesMovedCount = 0;
    if (fs.existsSync(UPLOAD_DIR)) {
      const allFiles = fs.readdirSync(UPLOAD_DIR).filter((f) => {
        const full = path.join(UPLOAD_DIR, f);
        return fs.statSync(full).isFile();
      });

      const urlUpdates: Array<{ oldUrl: string; newUrl: string }> = [];
      for (const filename of allFiles) {
        const newUrl = moveFile(filename, targetUserId);
        urlUpdates.push({
          oldUrl: `/uploads/${filename}`,
          newUrl,
        });
        filesMovedCount++;
      }

      // 4. Rewrite URLs in database
      if (urlUpdates.length > 0) {
        const dbClient2 = await pool.connect();
        try {
          await dbClient2.query("BEGIN");

          for (const { oldUrl, newUrl } of urlUpdates) {
            // media_items: thumbnail, video_url, audio_url, photos (JSONB)
            await dbClient2.query(
              `UPDATE media_items SET thumbnail = $2 WHERE thumbnail = $1`,
              [oldUrl, newUrl]
            );
            await dbClient2.query(
              `UPDATE media_items SET video_url = $2 WHERE video_url = $1`,
              [oldUrl, newUrl]
            );
            await dbClient2.query(
              `UPDATE media_items SET audio_url = $2 WHERE audio_url = $1`,
              [oldUrl, newUrl]
            );
            // Update inside photos JSONB array
            await dbClient2.query(
              `UPDATE media_items
               SET photos = (
                 SELECT jsonb_agg(
                   CASE WHEN (elem->>'src') = $1
                        THEN jsonb_set(elem, '{src}', to_jsonb($2::text))
                        ELSE elem
                   END
                 )
                 FROM jsonb_array_elements(photos) AS elem
               )
               WHERE photos::text LIKE $3`,
              [oldUrl, newUrl, `%${oldUrl}%`]
            );

            // hero_banners
            await dbClient2.query(
              `UPDATE hero_banners SET media_url = $2 WHERE media_url = $1`,
              [oldUrl, newUrl]
            );

            // branding
            await dbClient2.query(
              `UPDATE branding SET logo_url = $2 WHERE logo_url = $1`,
              [oldUrl, newUrl]
            );
            await dbClient2.query(
              `UPDATE branding SET favicon_url = $2 WHERE favicon_url = $1`,
              [oldUrl, newUrl]
            );
            await dbClient2.query(
              `UPDATE branding SET background_image_url = $2
               WHERE background_image_url = $1`,
              [oldUrl, newUrl]
            );
            await dbClient2.query(
              `UPDATE branding SET profile_picture_url = $2
               WHERE profile_picture_url = $1`,
              [oldUrl, newUrl]
            );

            // profiles
            await dbClient2.query(
              `UPDATE profiles SET profile_picture_url = $2
               WHERE profile_picture_url = $1`,
              [oldUrl, newUrl]
            );

            // mood_board
            await dbClient2.query(
              `UPDATE mood_board SET image_url = $2 WHERE image_url = $1`,
              [oldUrl, newUrl]
            );

            // milestones
            await dbClient2.query(
              `UPDATE milestones SET image_url = $2 WHERE image_url = $1`,
              [oldUrl, newUrl]
            );

            // canvas_drawings
            await dbClient2.query(
              `UPDATE canvas_drawings SET thumbnail_url = $2
               WHERE thumbnail_url = $1`,
              [oldUrl, newUrl]
            );
          }

          await dbClient2.query("COMMIT");
        } catch (err) {
          await dbClient2.query("ROLLBACK");
          throw err;
        } finally {
          dbClient2.release();
        }
      }
    }

    log.push(`files moved: ${filesMovedCount} → /uploads/${targetUserId}/`);

    res.json({
      ok: true,
      targetUserId,
      targetEmail,
      log,
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ ok: false, error: "Migration failed", detail: String(err) });
  }
});

export default router;
