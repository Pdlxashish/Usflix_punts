/**
 * Script to clear all profile_id values from users table
 * Run this to test the profile selection flow
 * 
 * Usage: npm run tsx scripts/clear-profile-ids.ts
 */
import pool from "../src/db/connection.js";

async function clearProfileIds() {
  try {
    console.log("🔄 Clearing all profile_id values from users table...");
    
    const result = await pool.query(
      "UPDATE users SET profile_id = NULL"
    );
    
    console.log(`✅ Cleared ${result.rowCount} user profile selections`);
    console.log("📋 Users will need to select profiles on next login");
    
    // Show current state
    const users = await pool.query(
      "SELECT id, email, display_name, profile_id FROM users"
    );
    
    console.log("\n📊 Current users state:");
    console.table(users.rows);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing profile IDs:", error);
    process.exit(1);
  }
}

clearProfileIds();
