/**
 * Migration: Add user_id to all content tables for proper data isolation
 * 
 * This migration fixes the data leakage issue by adding user ownership to all content.
 * After this migration, each user will only see their own data.
 */
import pool from "../src/db/connection.js";

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log("🚀 Starting migration: Add user_id to content tables...\n");

    await client.query("BEGIN");

    // List of tables that need user_id
    const contentTables = [
      "media_items",
      "love_jar",
      "milestones",
      "bucket_list",
      "mood_board",
      "hero_banners",
      "collections",
      "playlist_songs",
      "mood_of_day",
      "quiz_questions",
      "time_greetings",
    ];

    // Get the first user in the system (or create a default one)
    const { rows: userRows } = await client.query(
      "SELECT id FROM users ORDER BY created_at ASC LIMIT 1"
    );

    let defaultUserId: number;
    
    if (userRows.length === 0) {
      console.log("⚠️  No users found. Creating default user...");
      // Create a default user for existing data
      const { rows } = await client.query(
        `INSERT INTO users (google_id, email, display_name, created_at)
         VALUES ('default-migration-user', 'admin@usflix.local', 'Default User', NOW())
         RETURNING id`
      );
      defaultUserId = rows[0].id;
      console.log(`✅ Created default user with ID: ${defaultUserId}\n`);
    } else {
      defaultUserId = userRows[0].id;
      console.log(`✅ Found existing user with ID: ${defaultUserId}\n`);
    }

    // Add user_id column to each table
    for (const table of contentTables) {
      console.log(`Processing table: ${table}...`);
      
      // Check if column already exists
      const columnCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'user_id'
      `, [table]);

      if (columnCheck.rows.length > 0) {
        console.log(`  ℹ️  Column user_id already exists in ${table}`);
        continue;
      }

      // Add user_id column (nullable first)
      await client.query(`
        ALTER TABLE ${table}
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log(`  ✅ Added user_id column to ${table}`);

      // Update existing rows to point to default user
      const updateResult = await client.query(`
        UPDATE ${table}
        SET user_id = $1
        WHERE user_id IS NULL
      `, [defaultUserId]);
      console.log(`  ✅ Updated ${updateResult.rowCount} rows with default user_id`);

      // Make column NOT NULL
      await client.query(`
        ALTER TABLE ${table}
        ALTER COLUMN user_id SET NOT NULL
      `);
      console.log(`  ✅ Made user_id NOT NULL in ${table}`);

      // Create index for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id)
      `);
      console.log(`  ✅ Created index on user_id in ${table}\n`);
    }

    // Special handling for branding table (single row per user)
    console.log("Processing table: branding...");
    const brandingCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'branding' AND column_name = 'user_id'
    `);

    if (brandingCheck.rows.length === 0) {
      // Branding needs special handling - change from single row to multi-row
      await client.query(`
        ALTER TABLE branding DROP CONSTRAINT IF EXISTS branding_pkey
      `);
      
      await client.query(`
        ALTER TABLE branding DROP CONSTRAINT IF EXISTS branding_id_check
      `);
      
      await client.query(`
        ALTER TABLE branding
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `);
      
      // Update existing branding row
      await client.query(`
        UPDATE branding SET user_id = $1 WHERE user_id IS NULL
      `, [defaultUserId]);
      
      await client.query(`
        ALTER TABLE branding ALTER COLUMN user_id SET NOT NULL
      `);
      
      // Change primary key from id to user_id
      await client.query(`
        ALTER TABLE branding DROP COLUMN id
      `);
      
      await client.query(`
        ALTER TABLE branding ADD PRIMARY KEY (user_id)
      `);
      
      console.log("  ✅ Updated branding table structure\n");
    } else {
      console.log("  ℹ️  Branding table already migrated\n");
    }

    // Special handling for canvas_drawings (already has profile_id, add user_id)
    console.log("Processing table: canvas_drawings...");
    const canvasCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'canvas_drawings' AND column_name = 'user_id'
    `);

    if (canvasCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE canvas_drawings
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `);
      
      // Try to match canvas drawings to users via profile_id
      await client.query(`
        UPDATE canvas_drawings cd
        SET user_id = (
          SELECT up.user_id
          FROM user_profiles up
          WHERE up.profile_id = cd.profile_id
          LIMIT 1
        )
        WHERE cd.profile_id IS NOT NULL AND cd.user_id IS NULL
      `);
      
      // Set default user for orphaned drawings
      await client.query(`
        UPDATE canvas_drawings
        SET user_id = $1
        WHERE user_id IS NULL
      `, [defaultUserId]);
      
      await client.query(`
        ALTER TABLE canvas_drawings ALTER COLUMN user_id SET NOT NULL
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_canvas_drawings_user_id ON canvas_drawings(user_id)
      `);
      
      console.log("  ✅ Updated canvas_drawings table\n");
    } else {
      console.log("  ℹ️  canvas_drawings already has user_id\n");
    }

    await client.query("COMMIT");
    
    console.log("\n✅ ✅ ✅ Migration completed successfully! ✅ ✅ ✅");
    console.log("\n📝 Next steps:");
    console.log("1. Update API routes to filter by user_id");
    console.log("2. Add requireUserAuth middleware to all content routes");
    console.log("3. Test with multiple users to verify isolation");
    console.log("4. Review activity_logs for any suspicious cross-user access\n");
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Migration failed:", error);
    console.error("\nThe database has been rolled back to its previous state.");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
