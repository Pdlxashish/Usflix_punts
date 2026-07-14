/**
 * Migration script to add multi-tenancy support (user_id column) to all tables.
 * This ensures data isolation between different user accounts.
 */
import pool from "../src/db/connection.js";

async function addMultiTenancySupport(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    console.log("🔄 Adding user_id columns to tables for multi-tenancy support...");
    
    // Tables that need user_id column
    const tables = [
      'hero_banners',
      'branding',
      'profiles',
      'collections',
      'media_items',
      'love_letters',
      'love_jar',
      'mood_board',
      'milestones',
      'quiz_questions',
      'bucket_list',
      'mood_of_day',
      'playlist_songs',
      'canvas_drawings',
      'time_greetings'
    ];
    
    for (const table of tables) {
      // Check if user_id column already exists
      const checkColumn = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'user_id'
      `, [table]);
      
      if (checkColumn.rows.length === 0) {
        console.log(`  Adding user_id to ${table}...`);
        
        // Add user_id column (nullable initially for migration)
        await client.query(`
          ALTER TABLE ${table}
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        `);
        
        // Get the first user (admin/default user)
        const { rows: users } = await client.query(
          "SELECT id FROM users ORDER BY created_at ASC LIMIT 1"
        );
        
        if (users.length > 0) {
          const defaultUserId = users[0].id;
          
          // Assign all existing records to the first user
          await client.query(`
            UPDATE ${table}
            SET user_id = $1
            WHERE user_id IS NULL
          `, [defaultUserId]);
        }
        
        // Make user_id NOT NULL after assigning existing records
        await client.query(`
          ALTER TABLE ${table}
          ALTER COLUMN user_id SET NOT NULL
        `);
        
        // Add index for better query performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table} (user_id)
        `);
        
        console.log(`  ✅ ${table} updated`);
      } else {
        console.log(`  ⏭️  ${table} already has user_id column`);
      }
    }
    
    console.log("\n🔄 Handling special cases...");
    
    // For branding table, we need to modify the unique constraint
    // since each user should have their own branding row
    const brandingConstraintCheck = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'branding' AND constraint_type = 'CHECK' AND constraint_name LIKE '%branding_id_check%'
    `);
    
    if (brandingConstraintCheck.rows.length > 0) {
      console.log("  Removing single-row constraint from branding table...");
      await client.query(`
        ALTER TABLE branding DROP CONSTRAINT IF EXISTS branding_id_check
      `);
      await client.query(`
        ALTER TABLE branding DROP CONSTRAINT IF EXISTS branding_pkey
      `);
      await client.query(`
        ALTER TABLE branding ADD PRIMARY KEY (user_id)
      `);
      console.log("  ✅ Branding table updated to support multiple users");
    }
    
    await client.query("COMMIT");
    console.log("\n✅ Multi-tenancy support added successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Update all API routes to filter by user_id");
    console.log("   2. Test data isolation between users");
    console.log("   3. Verify new users see empty dashboards");
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addMultiTenancySupport().catch(console.error);
