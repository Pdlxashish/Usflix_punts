/**
 * PostgreSQL connection pool.
 * Uses DATABASE_URL from environment.
 */
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
  process.exit(1);
});

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected:", result.rows[0].now);
  } finally {
    client.release();
  }
}

export default pool;
