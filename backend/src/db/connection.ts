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

// Log unexpected pool errors but don't crash — let the health check handle it
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

/**
 * Test DB connection with retries — Railway's Postgres can take a few seconds
 * to accept connections after the backend container starts.
 */
export async function testConnection(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT NOW()");
        console.log("✅ PostgreSQL connected:", result.rows[0].now);
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      if (attempt === retries) {
        throw new Error(
          `Failed to connect to PostgreSQL after ${retries} attempts. ` +
          `Check DATABASE_URL is set correctly.\n${err}`
        );
      }
      console.warn(`⏳ DB connection attempt ${attempt}/${retries} failed — retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export default pool;
