import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function resolveSpaceUserId(userId) {
  const linkedPartner = await pool.query(
    `SELECT p.user_id
     FROM user_profiles up
     JOIN profiles p ON p.id = up.profile_id
     WHERE up.user_id = $1 AND p.role = 'partner'
     LIMIT 1`,
    [userId]
  );
  if (linkedPartner.rows.length > 0) return linkedPartner.rows[0].user_id;

  const ownsPartner = await pool.query(
    `SELECT 1 FROM profiles WHERE user_id = $1 AND role = 'partner' LIMIT 1`,
    [userId]
  );
  if (ownsPartner.rows.length > 0) return userId;

  return userId;
}

for (const uid of [2, 5]) {
  const space = await resolveSpaceUserId(uid);
  const media = await pool.query("SELECT COUNT(*)::int as c FROM media_items WHERE user_id = $1", [space]);
  const profiles = await pool.query(
    `SELECT p.id, p.name, p.role, p.user_id FROM profiles p
     JOIN user_profiles up ON up.profile_id = p.id WHERE up.user_id = $1`,
    [uid]
  );
  console.log(`user ${uid} -> space ${space}, media count ${media.rows[0].c}`);
  console.log("  profiles:", profiles.rows);
}

await pool.end();
