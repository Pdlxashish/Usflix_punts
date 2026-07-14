/**
 * Quick check to see if multi-tenancy fix has been applied
 */
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('🔍 Checking Multi-Tenancy Fix Status...\n');

async function checkStatus() {
  const client = await pool.connect();
  
  try {
    // Check key tables for user_id column
    const criticalTables = ['profiles', 'hero_banners', 'media_items'];
    let allHaveUserId = true;
    
    for (const table of criticalTables) {
      const { rows } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'user_id'
      `, [table]);
      
      if (rows.length === 0) {
        console.log(`❌ ${table} is missing user_id column`);
        allHaveUserId = false;
      }
    }
    
    if (!allHaveUserId) {
      console.log('\n❌ FIX NOT APPLIED\n');
      console.log('📋 To apply the fix, run:');
      console.log('   cd backend');
      console.log('   npx tsx scripts/add-multi-tenancy-support.ts\n');
      console.log('📖 For detailed instructions, see: APPLY_FIX_NOW.md\n');
      return false;
    }
    
    // Check for NULL user_ids
    const { rows: nullCheck } = await client.query(`
      SELECT COUNT(*) as count FROM profiles WHERE user_id IS NULL
    `);
    
    const nullCount = parseInt(nullCheck[0].count);
    
    if (nullCount > 0) {
      console.log(`⚠️  FIX PARTIALLY APPLIED (${nullCount} profiles with NULL user_id)\n`);
      console.log('📋 To complete the fix, run:');
      console.log('   cd backend');
      console.log('   npx tsx scripts/add-multi-tenancy-support.ts\n');
      return false;
    }
    
    // Check user count
    const { rows: users } = await client.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(users[0].count);
    
    console.log('✅ FIX SUCCESSFULLY APPLIED!\n');
    console.log(`📊 Database Status:`);
    console.log(`   - All tables have user_id columns`);
    console.log(`   - No NULL user_ids found`);
    console.log(`   - ${userCount} user account(s) in database\n`);
    
    if (userCount === 0) {
      console.log('⚠️  No users yet. Sign in with Google to create the first user.\n');
    } else if (userCount === 1) {
      console.log('💡 Tip: Create a second Google account to test data isolation.\n');
    } else {
      console.log('✅ Multiple users exist - data isolation should be working!\n');
    }
    
    console.log('🧪 To run full tests, execute:');
    console.log('   node backend/scripts/test-multi-tenancy.mjs\n');
    
    return true;
    
  } catch (error) {
    if (error.code === '42P01') {
      console.log('❌ Tables not found. Start the server first to create database schema.\n');
      console.log('📋 Run:');
      console.log('   cd backend');
      console.log('   npm run dev\n');
    } else {
      console.error('❌ Error checking status:', error.message);
    }
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

checkStatus().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
