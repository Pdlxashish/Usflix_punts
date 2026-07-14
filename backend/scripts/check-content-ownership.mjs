/**
 * Script: Check content ownership across all users
 * Shows which user owns how much content
 */
import pkg from 'pg';
const { Pool } = pkg;

import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkOwnership() {
  const client = await pool.connect();
  
  try {
    console.log("📊 Checking content ownership...\n");

    // Get all users
    const { rows: users } = await client.query(
      "SELECT id, email, display_name FROM users ORDER BY id ASC"
    );

    console.log(`Found ${users.length} users:\n`);

    // Content tables to check
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

    // Check each user's content
    for (const user of users) {
      const highlight = user.email === 'poudelashish0718@gmail.com' ? '👉 ' : '   ';
      console.log(`${highlight}User ${user.id}: ${user.email} (${user.display_name})`);
      
      let totalRows = 0;
      
      for (const table of contentTables) {
        try {
          // Check if table has user_id column
          const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'user_id'
          `, [table]);

          if (columnCheck.rows.length === 0) {
            continue; // Skip tables without user_id
          }

          const { rows: countRows } = await client.query(`
            SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1
          `, [user.id]);

          const count = parseInt(countRows[0].count);
          if (count > 0) {
            console.log(`     ${table}: ${count} rows`);
            totalRows += count;
          }
        } catch (error) {
          // Skip tables that don't exist
        }
      }
      
      if (totalRows === 0) {
        console.log(`     (No content - empty system)`);
      }
      console.log(`     Total: ${totalRows} rows\n`);
    }

    // Summary
    console.log("=" .repeat(60));
    console.log("📊 Summary:");
    console.log("=" .repeat(60));
    
    for (const user of users) {
      let totalRows = 0;
      
      for (const table of contentTables) {
        try {
          const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'user_id'
          `, [table]);

          if (columnCheck.rows.length === 0) continue;

          const { rows: countRows } = await client.query(`
            SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1
          `, [user.id]);

          totalRows += parseInt(countRows[0].count);
        } catch (error) {
          // Skip
        }
      }
      
      const highlight = user.email === 'poudelashish0718@gmail.com' ? '✅ ' : '   ';
      const status = totalRows > 0 ? `${totalRows} rows` : 'Empty';
      console.log(`${highlight}${user.email}: ${status}`);
    }
    
    console.log("\n✅ Content ownership check complete!\n");
    
  } catch (error) {
    console.error("\n❌ Check failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkOwnership().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
