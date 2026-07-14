import pool from "../src/db/connection.js";

async function listUsers() {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, display_name, auth_provider, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    
    console.log("\n📋 All Users in Database:\n");
    console.log("=".repeat(80));
    
    if (rows.length === 0) {
      console.log("No users found!");
    } else {
      rows.forEach((u, i) => {
        console.log(`\n${i + 1}. ${u.email}`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Name: ${u.display_name}`);
        console.log(`   Auth: ${u.auth_provider}`);
        console.log(`   Created: ${u.created_at}`);
      });
    }
    
    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

listUsers();
