/**
 * Full tenant migration: reassign all DB content + move uploads into
 * uploads/{targetUserId}/ for poudelashish0718@gmail.com (or custom email).
 *
 * Usage:
 *   npm run migrate:tenant
 *   npm run migrate:tenant -- other@email.com
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pool from "../src/db/connection.js";

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const DEFAULT_EMAIL = "poudelashish0718@gmail.com";

const CONTENT_TABLES = [
  "collections",
  "media_items",
  "hero_banners",
  "love_letters",
  "love_jar",
  "mood_board",
  "milestones",
  "quiz_questions",
  "bucket_list",
  "mood_of_day",
  "playlist_songs",
  "canvas_drawings",
  "time_greetings",
];

function tenantDir(userId: number): string {
  const dir = path.join(UPLOAD_DIR, String(userId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function moveFileToTenant(srcPath: string, filename: string, targetUserId: number): string {
  const destPath = path.join(tenantDir(targetUserId), filename);
  if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
    fs.renameSync(srcPath, destPath);
  }
  return `/uploads/${targetUserId}/${filename}`;
}

async function rewriteUrl(oldUrl: string, newUrl: string, client: typeof pool) {
  if (!oldUrl || oldUrl === newUrl) return;

  await client.query(`UPDATE media_items SET thumbnail = $2 WHERE thumbnail = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE media_items SET video_url = $2 WHERE video_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE media_items SET audio_url = $2 WHERE audio_url = $1`, [oldUrl, newUrl]);
  await client.query(
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
  await client.query(`UPDATE hero_banners SET media_url = $2 WHERE media_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE branding SET logo_url = $2 WHERE logo_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE branding SET favicon_url = $2 WHERE favicon_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE branding SET background_image_url = $2 WHERE background_image_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE branding SET profile_picture_url = $2 WHERE profile_picture_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE profiles SET profile_picture_url = $2 WHERE profile_picture_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE mood_board SET image_url = $2 WHERE image_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE milestones SET image_url = $2 WHERE image_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE canvas_drawings SET thumbnail_url = $2 WHERE thumbnail_url = $1`, [oldUrl, newUrl]);
}

async function migrateTenant(targetEmail: string) {
  const email = targetEmail.trim().toLowerCase();
  console.log(`\n🚀 Migrating all data to tenant: ${email}\n`);

  const { rows: userRows } = await pool.query(
    `SELECT id, email, display_name FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [email]
  );
  if (userRows.length === 0) {
    throw new Error(`User not found: ${email}. Sign in once to create the account.`);
  }

  const targetUserId: number = userRows[0].id;
  console.log(`✅ Target user: ${userRows[0].display_name} (id=${targetUserId})\n`);

  const client = await pool.connect();
  const log: string[] = [];

  try {
    await client.query("BEGIN");

    for (const table of CONTENT_TABLES) {
      const { rowCount } = await client.query(
        `UPDATE ${table} SET user_id = $1 WHERE user_id != $1`,
        [targetUserId]
      );
      if (rowCount && rowCount > 0) log.push(`${table}: ${rowCount} rows`);
    }

    await client.query(`INSERT INTO branding (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [targetUserId]);
    const brandingMoved = await client.query(`UPDATE branding SET user_id = $1 WHERE user_id != $1`, [targetUserId]);
    await client.query(`DELETE FROM branding WHERE user_id != $1`, [targetUserId]);
    if (brandingMoved.rowCount) log.push(`branding: consolidated`);

    const profilesMoved = await client.query(
      `UPDATE profiles SET user_id = $1 WHERE user_id != $1`,
      [targetUserId]
    );
    if (profilesMoved.rowCount) log.push(`profiles: ${profilesMoved.rowCount} rows`);

    // Link all profiles to target user account
    await client.query(
      `INSERT INTO user_profiles (user_id, profile_id, is_primary)
       SELECT $1, p.id, (ROW_NUMBER() OVER (ORDER BY p.id) = 1)
       FROM profiles p
       WHERE p.user_id = $1
       ON CONFLICT (user_id, profile_id) DO NOTHING`,
      [targetUserId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Move upload files into target tenant folder
  let filesMoved = 0;
  const urlUpdates: Array<{ oldUrl: string; newUrl: string }> = [];

  if (fs.existsSync(UPLOAD_DIR)) {
    // Flat files in uploads/
    for (const entry of fs.readdirSync(UPLOAD_DIR)) {
      const full = path.join(UPLOAD_DIR, entry);
      if (!fs.statSync(full).isFile()) continue;
      const newUrl = moveFileToTenant(full, entry, targetUserId);
      urlUpdates.push({ oldUrl: `/uploads/${entry}`, newUrl });
      filesMoved++;
    }

    // Files in other user subfolders
    for (const entry of fs.readdirSync(UPLOAD_DIR)) {
      const subDir = path.join(UPLOAD_DIR, entry);
      if (!fs.statSync(subDir).isDirectory()) continue;
      if (entry === String(targetUserId)) continue;

      for (const filename of fs.readdirSync(subDir)) {
        const srcPath = path.join(subDir, filename);
        if (!fs.statSync(srcPath).isFile()) continue;
        const newUrl = moveFileToTenant(srcPath, filename, targetUserId);
        urlUpdates.push({ oldUrl: `/uploads/${entry}/${filename}`, newUrl });
        filesMoved++;
      }
    }
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");
    for (const { oldUrl, newUrl } of urlUpdates) {
      await rewriteUrl(oldUrl, newUrl, dbClient as unknown as typeof pool);
    }
    await dbClient.query("COMMIT");
  } catch (err) {
    await dbClient.query("ROLLBACK");
    throw err;
  } finally {
    dbClient.release();
  }

  console.log("📦 Database:");
  log.forEach((line) => console.log(`   ${line}`));
  console.log(`\n📁 Files moved: ${filesMoved} → /uploads/${targetUserId}/`);
  console.log(`🔗 URL rewrites: ${urlUpdates.length}`);
  console.log("\n✅ Migration complete.\n");
}

const email = process.argv[2] || DEFAULT_EMAIL;
migrateTenant(email)
  .catch((err) => {
    console.error("❌ Migration failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
