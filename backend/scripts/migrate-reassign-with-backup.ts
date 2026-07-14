/**
 * Reassign all orphaned content to poudelashish0718@gmail.com (or custom email).
 * Creates a JSON backup before any writes. Moves local upload files into the
 * target tenant folder and rewrites media URLs.
 *
 * Usage:
 *   npm run migrate:reassign
 *   npm run migrate:reassign -- other@email.com
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pool from "../src/db/connection.js";

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const DEFAULT_EMAIL = "poudelashish0718@gmail.com";
const BACKUP_ROOT = path.join(process.cwd(), "backups");

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

const META_TABLES = ["users", "profiles", "user_profiles", "clerk_users", "branding"];

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

async function backupTable(
  client: Awaited<ReturnType<typeof pool.connect>>,
  table: string,
  backupDir: string
): Promise<number> {
  try {
    const { rows } = await client.query(`SELECT * FROM ${table}`);
    fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(rows, null, 2));
    return rows.length;
  } catch {
    return 0;
  }
}

async function rewriteUrl(
  oldUrl: string,
  newUrl: string,
  client: Awaited<ReturnType<typeof pool.connect>>
) {
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
  await client.query(
    `UPDATE branding SET background_image_url = $2 WHERE background_image_url = $1`,
    [oldUrl, newUrl]
  );
  await client.query(
    `UPDATE branding SET profile_picture_url = $2 WHERE profile_picture_url = $1`,
    [oldUrl, newUrl]
  );
  await client.query(
    `UPDATE profiles SET profile_picture_url = $2 WHERE profile_picture_url = $1`,
    [oldUrl, newUrl]
  );
  await client.query(`UPDATE mood_board SET image_url = $2 WHERE image_url = $1`, [oldUrl, newUrl]);
  await client.query(`UPDATE milestones SET image_url = $2 WHERE image_url = $1`, [oldUrl, newUrl]);
  await client.query(
    `UPDATE canvas_drawings SET thumbnail_url = $2 WHERE thumbnail_url = $1`,
    [oldUrl, newUrl]
  );
}

async function migrateWithBackup(targetEmail: string) {
  const email = targetEmail.trim().toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(BACKUP_ROOT, `pre-migrate-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`\n📦 Backup directory: ${backupDir}\n`);

  const backupClient = await pool.connect();
  try {
    console.log("💾 Backing up tables…");
    for (const table of [...META_TABLES, ...CONTENT_TABLES]) {
      const count = await backupTable(backupClient, table, backupDir);
      if (count > 0) console.log(`   ${table}: ${count} rows`);
    }
  } finally {
    backupClient.release();
  }

  // Resolve target user — prefer clerk_users mapping, fall back to users.email
  const { rows: userRows } = await pool.query(
    `SELECT u.id, u.email, u.display_name, cu.clerk_id
     FROM users u
     LEFT JOIN clerk_users cu ON cu.user_id = u.id
     WHERE LOWER(u.email) = $1
     ORDER BY u.created_at ASC
     LIMIT 1`,
    [email]
  );

  if (userRows.length === 0) {
    console.log("\n⚠️  Target user not found. Available accounts:");
    const { rows: all } = await pool.query(
      `SELECT u.id, u.email, u.display_name, cu.clerk_id
       FROM users u
       LEFT JOIN clerk_users cu ON cu.user_id = u.id
       ORDER BY u.id`
    );
    all.forEach((u) => {
      console.log(`   id=${u.id} email=${u.email} clerk=${u.clerk_id ?? "—"}`);
    });
    throw new Error(`User not found: ${email}. Sign in once via Clerk to create the account.`);
  }

  const targetUserId: number = userRows[0].id;
  console.log(`\n✅ Target: ${userRows[0].display_name} (users.id=${targetUserId})`);
  if (userRows[0].clerk_id) console.log(`   Clerk ID: ${userRows[0].clerk_id}`);

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

    await client.query(
      `INSERT INTO branding (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [targetUserId]
    );

    // Branding PK is user_id — merge source row into target instead of reassigning user_id
    const { rows: sourceBranding } = await client.query(
      `SELECT * FROM branding WHERE user_id != $1`,
      [targetUserId]
    );
    if (sourceBranding.length > 0) {
      const src = sourceBranding[0];
      await client.query(
        `UPDATE branding SET
           platform_name = $2,
           hero_tagline = $3,
           hero_subtitle = $4,
           footer_text = $5,
           home_page_title = $6,
           home_page_description = $7,
           relationship_start_date = $8,
           primary_color = $9,
           accent_color = $10,
           background_color = $11,
           logo_url = $12,
           favicon_url = $13,
           heading_font = $14,
           body_font = $15,
           show_time_together_section = $16,
           show_story_continues_section = $17,
           show_featured_section = $18,
           background_image_url = $19,
           background_pattern = $20,
           background_gradient = $21,
           profile_picture_url = $22,
           profile_picture_shape = $23,
           updated_at = NOW()
         WHERE user_id = $1`,
        [
          targetUserId,
          src.platform_name,
          src.hero_tagline,
          src.hero_subtitle,
          src.footer_text,
          src.home_page_title,
          src.home_page_description,
          src.relationship_start_date,
          src.primary_color,
          src.accent_color,
          src.background_color,
          src.logo_url,
          src.favicon_url,
          src.heading_font,
          src.body_font,
          src.show_time_together_section,
          src.show_story_continues_section,
          src.show_featured_section,
          src.background_image_url,
          src.background_pattern,
          src.background_gradient,
          src.profile_picture_url,
          src.profile_picture_shape,
        ]
      );
      await client.query(`DELETE FROM branding WHERE user_id != $1`, [targetUserId]);
      log.push(`branding: copied to target`);
    }

    const profilesMoved = await client.query(
      `UPDATE profiles SET user_id = $1 WHERE user_id != $1`,
      [targetUserId]
    );
    if (profilesMoved.rowCount) log.push(`profiles: ${profilesMoved.rowCount} rows`);

    // Re-link user_profiles: move old owner's links to target account
    await client.query(
      `UPDATE user_profiles SET user_id = $1 WHERE user_id != $1`,
      [targetUserId]
    );

    await client.query(
      `INSERT INTO user_profiles (user_id, profile_id, is_primary)
       SELECT $1, p.id, (p.role = 'self' OR ROW_NUMBER() OVER (ORDER BY p.created_at NULLS LAST, p.id) = 1)
       FROM profiles p
       WHERE p.user_id = $1
       ON CONFLICT (user_id, profile_id) DO NOTHING`,
      [targetUserId]
    );

    // Mark first self profile as primary if none set
    await client.query(
      `UPDATE user_profiles up
       SET is_primary = true
       FROM profiles p
       WHERE up.profile_id = p.id AND up.user_id = $1 AND p.role = 'self'
         AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = $1 AND is_primary = true)`,
      [targetUserId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  let filesMoved = 0;
  const urlUpdates: Array<{ oldUrl: string; newUrl: string }> = [];

  if (fs.existsSync(UPLOAD_DIR)) {
    for (const entry of fs.readdirSync(UPLOAD_DIR)) {
      const full = path.join(UPLOAD_DIR, entry);
      if (!fs.statSync(full).isFile()) continue;
      const newUrl = moveFileToTenant(full, entry, targetUserId);
      urlUpdates.push({ oldUrl: `/uploads/${entry}`, newUrl });
      filesMoved++;
    }

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
      await rewriteUrl(oldUrl, newUrl, dbClient);
    }
    await dbClient.query("COMMIT");
  } catch (err) {
    await dbClient.query("ROLLBACK");
    throw err;
  } finally {
    dbClient.release();
  }

  console.log("\n📦 Database updates:");
  log.forEach((line) => console.log(`   ${line}`));
  console.log(`\n📁 Files moved: ${filesMoved} → /uploads/${targetUserId}/`);
  console.log(`🔗 URL rewrites: ${urlUpdates.length}`);
  console.log(`\n💾 Backup saved to: ${backupDir}`);
  console.log("\n✅ Migration complete. Sign in and visit /select-profile to verify.\n");
}

const email = process.argv[2] || DEFAULT_EMAIL;
migrateWithBackup(email)
  .catch((err) => {
    console.error("❌ Migration failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
