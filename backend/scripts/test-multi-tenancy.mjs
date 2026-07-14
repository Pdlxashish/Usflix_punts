/**
 * Test script to verify multi-tenancy data isolation is working correctly.
 * Run after the migration to ensure each user only sees their own data.
 */
import pg from 'pg';
const { Pool } = pg;

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('🧪 Testing Multi-Tenancy Data Isolation\n');

async function runTests() {
  const client = await pool.connect();
  
  try {
    // Test 1: Check if user_id columns exist
    console.log('📋 Test 1: Checking user_id columns exist...');
    const tables = [
      'hero_banners', 'profiles', 'collections', 'media_items',
      'love_letters', 'love_jar', 'mood_board', 'milestones',
      'quiz_questions', 'bucket_list', 'mood_of_day', 'playlist_songs',
      'canvas_drawings', 'time_greetings'
    ];
    
    let columnsExist = true;
    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'user_id'
      `, [table]);
      
      if (rows.length === 0) {
        console.log(`   ❌ ${table} is missing user_id column`);
        columnsExist = false;
      } else {
        console.log(`   ✅ ${table} has user_id column`);
      }
    }
    
    if (!columnsExist) {
      console.log('\n⚠️  Some tables are missing user_id columns. Run the migration script first.\n');
      return;
    }
    
    console.log('\n✅ All tables have user_id columns\n');
    
    // Test 2: Check for NULL user_ids
    console.log('📋 Test 2: Checking for NULL user_ids...');
    let hasNulls = false;
    
    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT COUNT(*) as count FROM ${table} WHERE user_id IS NULL
      `);
      
      const count = parseInt(rows[0].count);
      if (count > 0) {
        console.log(`   ❌ ${table} has ${count} rows with NULL user_id`);
        hasNulls = true;
      }
    }
    
    if (hasNulls) {
      console.log('\n⚠️  Found NULL user_ids. This means data is not properly assigned to users.\n');
    } else {
      console.log('   ✅ No NULL user_ids found\n');
    }
    
    // Test 3: Check branding table structure
    console.log('📋 Test 3: Checking branding table structure...');
    const { rows: brandingPK } = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'branding' AND constraint_type = 'PRIMARY KEY'
    `);
    
    if (brandingPK.length > 0) {
      console.log('   ✅ Branding table has primary key\n');
    } else {
      console.log('   ❌ Branding table is missing primary key\n');
    }
    
    // Test 4: Check data distribution across users
    console.log('📋 Test 4: Data distribution per user...');
    const { rows: users } = await client.query('SELECT id, email FROM users ORDER BY id');
    
    if (users.length === 0) {
      console.log('   ⚠️  No users found in database. Create a user via Google sign-in first.\n');
    } else {
      console.log(`   Found ${users.length} user(s):\n`);
      
      for (const user of users) {
        console.log(`   User ${user.id} (${user.email}):`);
        
        // Count records per table for this user
        for (const table of ['profiles', 'hero_banners', 'media_items', 'love_letters']) {
          try {
            const { rows } = await client.query(`
              SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1
            `, [user.id]);
            
            const count = parseInt(rows[0].count);
            console.log(`     - ${table}: ${count} record(s)`);
          } catch (err) {
            // Table might not exist yet
          }
        }
        console.log('');
      }
    }
    
    // Test 5: Check indexes exist
    console.log('📋 Test 5: Checking performance indexes...');
    let allIndexesExist = true;
    
    for (const table of ['profiles', 'hero_banners', 'media_items', 'love_letters']) {
      const { rows } = await client.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = $1 AND indexname = $2
      `, [table, `idx_${table}_user_id`]);
      
      if (rows.length === 0) {
        console.log(`   ⚠️  Missing index: idx_${table}_user_id`);
        allIndexesExist = false;
      }
    }
    
    if (allIndexesExist) {
      console.log('   ✅ All performance indexes exist\n');
    } else {
      console.log('   ⚠️  Some indexes are missing (optional but recommended)\n');
    }
    
    // Test 6: Simulate cross-user query (should return empty)
    console.log('📋 Test 6: Testing data isolation...');
    if (users.length >= 2) {
      const user1 = users[0].id;
      const user2 = users[1].id;
      
      // Get profiles count for user 1
      const { rows: user1Profiles } = await client.query(
        'SELECT COUNT(*) as count FROM profiles WHERE user_id = $1',
        [user1]
      );
      
      // Get profiles count for user 2
      const { rows: user2Profiles } = await client.query(
        'SELECT COUNT(*) as count FROM profiles WHERE user_id = $1',
        [user2]
      );
      
      const count1 = parseInt(user1Profiles[0].count);
      const count2 = parseInt(user2Profiles[0].count);
      
      console.log(`   User ${user1}: ${count1} profile(s)`);
      console.log(`   User ${user2}: ${count2} profile(s)`);
      
      // Verify cross-user query returns nothing
      const { rows: crossQuery } = await client.query(
        'SELECT * FROM profiles WHERE user_id = $1',
        [user2]
      );
      
      const shouldNotSeeUser1Data = crossQuery.every(p => p.user_id !== user1);
      
      if (shouldNotSeeUser1Data) {
        console.log('   ✅ Data isolation is working - users cannot see each other\'s data\n');
      } else {
        console.log('   ❌ Data isolation FAILED - cross-contamination detected!\n');
      }
    } else {
      console.log('   ⏭️  Need at least 2 users to test isolation. Create another Google account and sign in.\n');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    
    if (columnsExist && !hasNulls && users.length > 0) {
      console.log('✅ Multi-tenancy is properly configured!');
      console.log('\n✨ What to test manually:');
      console.log('   1. Sign in with User A');
      console.log('   2. Add some data (profiles, banners, etc.)');
      console.log('   3. Sign out and sign in with User B');
      console.log('   4. Verify you see an empty dashboard');
      console.log('   5. Add different data for User B');
      console.log('   6. Sign back in as User A');
      console.log('   7. Verify User B\'s data is NOT visible\n');
    } else {
      console.log('⚠️  Multi-tenancy setup is incomplete:');
      if (!columnsExist) console.log('   - Run migration: npx tsx scripts/add-multi-tenancy-support.ts');
      if (hasNulls) console.log('   - Fix NULL user_ids in database');
      if (users.length === 0) console.log('   - Create at least one user via Google sign-in');
      console.log('');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
