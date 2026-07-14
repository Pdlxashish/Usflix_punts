import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function getLinkedPartner(userId) {
  const { rows } = await pool.query(
    `SELECT cu.email, cu.display_name, cu.user_id
     FROM tenant_memberships tm
     JOIN clerk_users cu ON cu.user_id = CASE
       WHEN tm.owner_user_id = $1 THEN tm.member_user_id
       ELSE tm.owner_user_id
     END
     WHERE (tm.owner_user_id = $1 OR tm.member_user_id = $1)
       AND tm.owner_user_id != tm.member_user_id
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

console.log("user 2 partner:", await getLinkedPartner(2));
console.log("user 5 partner:", await getLinkedPartner(5));

await pool.end();
