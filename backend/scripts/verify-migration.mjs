import dotenv from "dotenv";
import pkg from "pg";
dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const email = "poudelashish0718@gmail.com";

try {
  const { rows: users } = await pool.query(
    `SELECT id, email FROM users WHERE LOWER(email) = $1`,
    [email]
  );
  const uid = users[0]?.id;
  console.log("Target user id:", uid);

  const media = await pool.query(
    `SELECT id, type, title, thumbnail, video_url, audio_url FROM media_items WHERE user_id = $1`,
    [uid]
  );
  console.log("\nMedia items:", media.rowCount);
  media.rows.forEach((m) =>
    console.log(`  [${m.type}] ${m.title} | thumb=${m.thumbnail?.slice(0, 50) ?? "—"}`)
  );

  const profiles = await pool.query(
    `SELECT p.id, p.name, p.role, p.profile_picture_url, up.is_primary
     FROM profiles p
     JOIN user_profiles up ON up.profile_id = p.id
     WHERE up.user_id = $1`,
    [uid]
  );
  console.log("\nProfiles linked:", profiles.rowCount);
  profiles.rows.forEach((p) => console.log(`  ${p.name} (${p.role ?? "?"}) primary=${p.is_primary}`));

  const branding = await pool.query(`SELECT platform_name, hero_tagline, logo_url FROM branding WHERE user_id = $1`, [uid]);
  console.log("\nBranding:", branding.rows[0]);

  const banners = await pool.query(`SELECT title, media_url FROM hero_banners WHERE user_id = $1`, [uid]);
  console.log("\nHero banners:", banners.rowCount);
  banners.rows.forEach((b) => console.log(`  ${b.title} → ${b.media_url?.slice(0, 60)}`));

  const cols = await pool.query(`SELECT name FROM collections WHERE user_id = $1`, [uid]);
  console.log("\nCollections:", cols.rows.map((c) => c.name).join(", "));
} finally {
  await pool.end();
}
