/**
 * Drop all tables to allow clean schema recreation
 * USE WITH CAUTION - This will delete all data!
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function dropAllTables() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Dropping all tables...\n');
    
    await client.query('BEGIN');
    
    // Drop tables in reverse dependency order to avoid foreign key issues
    const tables = [
      'time_greetings',
      'canvas_drawings',
      'weather_locations',
      'playlist_songs',
      'mood_of_day',
      'bucket_list',
      'quiz_questions',
      'milestones',
      'mood_board',
      'love_jar',
      'love_letters',
      'distance_snapshots',
      'profile_locations',
      'activity_logs',
      'profile_sessions',
      'comments',
      'my_list',
      'user_profiles',
      'hero_banners',
      'media_items',
      'collections',
      'branding',
      'profiles',
      'users',
      'admin_users',
    ];
    
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`  ✅ Dropped ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop ${table}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('\n✅ All tables dropped successfully');
    console.log('💡 Restart your server to recreate tables with proper schema');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropAllTables().catch(console.error);
