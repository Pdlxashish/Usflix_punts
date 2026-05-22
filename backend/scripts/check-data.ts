/**
 * Quick check that your USFLIX data is still in PostgreSQL.
 * Run: npx tsx scripts/check-data.ts
 */
import dotenv from "dotenv";
import pool from "../src/db/connection.js";

dotenv.config();

async function main() {
  const tables = [
    "media_items",
    "collections",
    "profiles",
    "hero_banners",
    "branding",
    "admin_users",
  ] as const;

  console.log("\n📊 USFLIX database check\n");
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));

  for (const table of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
    console.log(`  ${table}: ${rows[0].c}`);
  }

  const { rows: albums } = await pool.query(
    "SELECT id, name FROM collections ORDER BY name"
  );
  console.log("\n  Albums:", albums.map((a) => a.name).join(", ") || "(none)");

  const { rows: media } = await pool.query(
    "SELECT COUNT(*)::int AS c FROM media_items"
  );
  console.log(`  Media items: ${media[0].c}`);

  await pool.end();
  console.log("\n✅ If counts look right, data was NOT deleted — fix API connection / restart servers.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
