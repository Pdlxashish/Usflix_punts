import dotenv from "dotenv";
import pool from "../src/db/connection.js";

dotenv.config();

const { rows } = await pool.query(
  `UPDATE profiles p SET name = u.display_name
   FROM users u
   WHERE p.user_id = u.id AND LOWER(u.email) = $1 AND p.role = 'self'
   RETURNING p.id, p.name`,
  ["poudelashish0718@gmail.com"]
);
console.log("Updated:", rows);
await pool.end();
