import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const users = await pool.query(`
  SELECT u.id, u.email, cu.clerk_id, cu.display_name
  FROM users u
  LEFT JOIN clerk_users cu ON cu.user_id = u.id
  ORDER BY u.id
`);
console.log("users:", JSON.stringify(users.rows, null, 2));

await pool.end();
