/**
 * Migration script to remove UNIQUE constraint from users.profile_id
 * This allows multiple users to potentially have the same profile selected.
 */
import pool from "../src/db/connection.js";

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting migration: remove UNIQUE constraint from users.profile_id...");

    await client.query("BEGIN");

    // Check if the constraint exists and drop it
    const constraintCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%profile_id%';
    `);

    if (constraintCheck.rows.length > 0) {
      const constraintName = constraintCheck.rows[0].constraint_name;
      console.log(`Found UNIQUE constraint: ${constraintName}`);
      
      await client.query(`ALTER TABLE users DROP CONSTRAINT ${constraintName};`);
      console.log(`✅ Dropped UNIQUE constraint: ${constraintName}`);
    } else {
      console.log("ℹ️  No UNIQUE constraint found on users.profile_id");
    }

    // Also check for unique indexes
    const indexCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'users'
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%profile_id%';
    `);

    for (const row of indexCheck.rows) {
      const indexName = row.indexname;
      console.log(`Found UNIQUE index: ${indexName}`);
      await client.query(`DROP INDEX IF EXISTS ${indexName};`);
      console.log(`✅ Dropped UNIQUE index: ${indexName}`);
    }

    await client.query("COMMIT");
    console.log("✅ Migration completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
