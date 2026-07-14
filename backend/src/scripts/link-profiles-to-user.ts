/**
 * Migration script: Link existing profiles to a Google user account
 * 
 * Usage:
 *   npm run script:link-profiles <user_email>
 * 
 * Example:
 *   npm run script:link-profiles shared@gmail.com
 * 
 * This will link ALL existing profiles (Ashik, Ashish, Us) to the specified user.
 */

import pool from "../db/connection.js";

async function linkProfilesToUser(userEmail: string) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔍 Looking for user: ${userEmail}`);
    
    // Find user by email
    const userResult = await client.query(
      "SELECT id, email, display_name FROM users WHERE email = $1",
      [userEmail]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${userEmail}`);
      console.log(`\nPlease sign in with Google first to create the user account.`);
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.display_name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    
    // Get all profiles
    const profilesResult = await client.query(
      "SELECT id, name, color FROM profiles ORDER BY id ASC"
    );
    
    if (profilesResult.rows.length === 0) {
      console.log(`❌ No profiles found in database`);
      console.log(`\nPlease create profiles first (via admin panel or seed data).`);
      return;
    }
    
    console.log(`\n📋 Found ${profilesResult.rows.length} profiles:`);
    profilesResult.rows.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    
    await client.query("BEGIN");
    
    // Link all profiles to user
    let linkedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < profilesResult.rows.length; i++) {
      const profile = profilesResult.rows[i];
      const isPrimary = i === 0; // First profile is primary
      
      try {
        await client.query(
          `INSERT INTO user_profiles (user_id, profile_id, is_primary)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, profile_id) DO UPDATE SET is_primary = $3`,
          [user.id, profile.id, isPrimary]
        );
        
        console.log(`   ✓ Linked: ${profile.name}${isPrimary ? " (primary)" : ""}`);
        linkedCount++;
      } catch (error) {
        console.log(`   ⚠ Skipped: ${profile.name} (already linked)`);
        skippedCount++;
      }
    }
    
    await client.query("COMMIT");
    
    console.log(`\n✅ Successfully linked ${linkedCount} profile(s)`);
    if (skippedCount > 0) {
      console.log(`   (${skippedCount} already linked)`);
    }
    
    // Set first profile as active if user has no active profile
    const firstProfile = profilesResult.rows[0];
    await client.query(
      "UPDATE users SET profile_id = $1 WHERE id = $2 AND profile_id IS NULL",
      [firstProfile.id, user.id]
    );
    
    console.log(`\n🎉 Done! User can now:`);
    console.log(`   1. Sign in with Google`);
    console.log(`   2. See profile selection screen`);
    console.log(`   3. Choose from: ${profilesResult.rows.map(p => p.name).join(", ")}`);
    console.log(`\n`);
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log(`
❌ Usage: npm run script:link-profiles <user_email>

Example:
  npm run script:link-profiles shared@gmail.com

This will link ALL existing profiles to the specified user.
Make sure the user has signed in with Google at least once.
  `);
  process.exit(1);
}

linkProfilesToUser(userEmail).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
