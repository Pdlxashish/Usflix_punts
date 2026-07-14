/**
 * Remove duplicate seed profiles (You/Me/Us) and keep one self + optional partner.
 * Usage: npm run migrate:cleanup-profiles
 */
import dotenv from "dotenv";
import pool from "../src/db/connection.js";

dotenv.config();

const TARGET_EMAIL = "poudelashish0718@gmail.com";
const SEED_PROFILE_IDS = ["p1", "p2", "p3"];

async function cleanup() {
  const { rows: users } = await pool.query(
    `SELECT id, display_name FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [TARGET_EMAIL.toLowerCase()]
  );
  if (users.length === 0) throw new Error(`User not found: ${TARGET_EMAIL}`);
  const userId: number = users[0].id;
  const displayName: string = users[0].display_name || "You";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Pick canonical self profile (prefer Clerk-created id)
    const { rows: selfProfiles } = await client.query(
      `SELECT p.id, p.name, up.is_primary
       FROM profiles p
       JOIN user_profiles up ON up.profile_id = p.id AND up.user_id = $1
       WHERE p.user_id = $1 AND (p.role = 'self' OR p.role IS NULL)
       ORDER BY
         CASE WHEN p.id = $2 THEN 0 ELSE 1 END,
         up.is_primary DESC,
         p.created_at ASC NULLS LAST`,
      [userId, `p-${userId}-self`]
    );

    if (selfProfiles.length === 0) throw new Error("No self profile found");

    const keepSelfId = selfProfiles[0].id;
    const keepName = displayName.split(" ")[0] || displayName;

    await client.query(
      `UPDATE profiles SET role = 'self', name = $2 WHERE id = $1`,
      [keepSelfId, keepName]
    );
    await client.query(
      `UPDATE user_profiles SET is_primary = (profile_id = $2) WHERE user_id = $1`,
      [userId, keepSelfId]
    );

    const toDelete = selfProfiles.slice(1).map((p) => p.id);
    for (const seedId of SEED_PROFILE_IDS) {
      if (!toDelete.includes(seedId)) {
        const { rows } = await client.query(
          `SELECT p.id FROM profiles p
           JOIN user_profiles up ON up.profile_id = p.id
           WHERE up.user_id = $1 AND p.id = $2`,
          [userId, seedId]
        );
        if (rows.length > 0) toDelete.push(seedId);
      }
    }

    for (const profileId of [...new Set(toDelete)]) {
      if (profileId === keepSelfId) continue;
      console.log(`   Removing duplicate profile: ${profileId}`);
      await client.query(`DELETE FROM profiles WHERE id = $1 AND user_id = $2`, [profileId, userId]);
    }

    await client.query("COMMIT");

    const { rows: remaining } = await pool.query(
      `SELECT p.id, p.name, p.role, up.is_primary
       FROM profiles p
       JOIN user_profiles up ON up.profile_id = p.id
       WHERE up.user_id = $1
       ORDER BY p.role ASC, p.name ASC`,
      [userId]
    );

    console.log(`\n✅ Profile cleanup done for ${TARGET_EMAIL}`);
    console.log(`   Kept self profile: ${keepSelfId} (${keepName})`);
    console.log(`   Remaining profiles (${remaining.length}):`);
    remaining.forEach((p) =>
      console.log(`     - ${p.name} [${p.role ?? "self"}]${p.is_primary ? " (primary)" : ""}`)
    );
    console.log("");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch((err) => {
  console.error("❌ Cleanup failed:", err.message || err);
  process.exit(1);
});
