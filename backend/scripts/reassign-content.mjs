/**
 * Script: Reassign all content to original user (poudelashish0718@gmail.com)
 */
import pkg from 'pg';
const { Pool } = pkg;

// Read database URL from environment or use default
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function reassignContent() {
  const client = await pool.connect();
  
  try {
    console.log("🚀 Starting content reassignment to poudelashish0718@gmail.com...\n");

    await client.query("BEGIN");

    // Find the target user (poudelashish0718@gmail.com)
    const { rows: targetUserRows } = await client.query(
      `SELECT id, email, display_name, google_id 
       FROM users 
       WHERE email = $1 OR email LIKE $2 OR google_id LIKE $3
       ORDER BY created_at ASC 
       LIMIT 1`,
      ['poudelashish0718@gmail.com', '%poudelashish0718%', '%poudelashish0718%']
    );

    if (targetUserRows.length === 0) {
      console.error("❌ Error: User with email poudelashish0718@gmail.com not found!");
      console.log("\nAvailable users:");
      const { rows: allUsers } = await client.query(
        "SELECT id, email, display_name, created_at FROM users ORDER BY created_at ASC"
      );
      allUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.display_name}, Created: ${user.created_at}`);
      });
      throw new Error("Target user not found");
    }

    const targetUserId = targetUserRows[0].id;
    const targetEmail = targetUserRows[0].email;
    
    console.log(`✅ Found target user:`);
    console.log(`   ID: ${targetUserId}`);
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Name: ${targetUserRows[0].display_name}`);
    console.log(`   Google ID: ${targetUserRows[0].google_id}\n`);

    // List all users to show what we're moving from
    const { rows: allUsers } = await client.query(
      "SELECT id, email, display_name FROM users ORDER BY created_at ASC"
    );
    
    console.log("📋 All users in database:");
    allUsers.forEach(user => {
      const marker = user.id === targetUserId ? "👉 TARGET" : "";
      console.log(`   ID: ${user.id}, Email: ${user.email}, Name: ${user.display_name} ${marker}`);
    });
    console.log();

    // List of all content tables
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
      "love_letters",
      "canvas_drawings",
      "branding",
    ];

    let totalRowsMoved = 0;

    // Reassign all content to target user
    console.log("🔄 Reassigning content to target user...\n");
    
    for (const table of contentTables) {
      try {
        // Check if table exists and has user_id column
        const tableCheck = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'user_id'
        `, [table]);

        if (tableCheck.rows.length === 0) {
          console.log(`  ⏭️  Skipping ${table} (no user_id column)`);
          continue;
        }

        // Count rows not owned by target user
        const { rows: countRows } = await client.query(`
          SELECT COUNT(*) as count FROM ${table} WHERE user_id != $1
        `, [targetUserId]);
        
        const rowsToMove = parseInt(countRows[0].count);

        if (rowsToMove === 0) {
          console.log(`  ✅ ${table}: No rows to move (all already owned by target user)`);
          continue;
        }

        // Special handling for branding (PRIMARY KEY conflict)
        if (table === 'branding') {
          // First, check if target user already has branding
          const { rows: existingBranding } = await client.query(
            `SELECT user_id FROM branding WHERE user_id = $1`,
            [targetUserId]
          );

          if (existingBranding.length > 0) {
            // Target user already has branding, delete others
            const deleteResult = await client.query(
              `DELETE FROM branding WHERE user_id != $1`,
              [targetUserId]
            );
            console.log(`  ✅ ${table}: Deleted ${deleteResult.rowCount} conflicting branding rows (target user already has branding)`);
          } else {
            // Move the first branding to target user, delete others
            const { rows: firstBranding } = await client.query(
              `SELECT user_id FROM branding ORDER BY updated_at DESC LIMIT 1`
            );
            
            if (firstBranding.length > 0) {
              await client.query(
                `UPDATE branding SET user_id = $1 WHERE user_id = $2`,
                [targetUserId, firstBranding[0].user_id]
              );
              console.log(`  ✅ ${table}: Moved branding from user ${firstBranding[0].user_id} to user ${targetUserId}`);
              
              // Delete any other branding rows
              const deleteResult = await client.query(
                `DELETE FROM branding WHERE user_id != $1`,
                [targetUserId]
              );
              if (deleteResult.rowCount > 0) {
                console.log(`  ✅ ${table}: Deleted ${deleteResult.rowCount} other branding rows`);
              }
            }
          }
          totalRowsMoved += rowsToMove;
          continue;
        }

        // For all other tables, simply update user_id
        const updateResult = await client.query(`
          UPDATE ${table}
          SET user_id = $1
          WHERE user_id != $1
        `, [targetUserId]);

        const movedCount = updateResult.rowCount || 0;
        totalRowsMoved += movedCount;

        console.log(`  ✅ ${table}: Reassigned ${movedCount} rows to user ${targetUserId}`);

      } catch (error) {
        console.error(`  ❌ Error processing ${table}:`, error.message);
      }
    }

    await client.query("COMMIT");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ ✅ ✅ Content reassignment completed successfully! ✅ ✅ ✅");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Target User: ${targetEmail} (ID: ${targetUserId})`);
    console.log(`   Total Rows Reassigned: ${totalRowsMoved}`);
    console.log(`\n💡 All content is now owned by: ${targetEmail}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Sign in with ${targetEmail}`);
    console.log(`   2. Verify all content is visible`);
    console.log(`   3. Other users will now see empty systems\n`);
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Content reassignment failed:", error);
    console.error("\nThe database has been rolled back to its previous state.");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

reassignContent().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
