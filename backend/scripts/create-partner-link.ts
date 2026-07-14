/**
 * Manually create a partner link between two users
 * This should only be used when invitation flow was bypassed or broken
 */
import pool from "../src/db/connection.js";
import { generateCoupleId } from "../src/utils/couple-id.js";
import { householdIdForOwner } from "../src/services/invitations.js";

async function createPartnerLink() {
  const email1 = "poudelashish0718@gmail.com";
  const email2 = "punts1803@gmail.com";

  console.log("\n🔗 CREATING PARTNER LINK\n");
  console.log("=".repeat(80));

  const client = await pool.connect();

  try {
    // Get user IDs
    const { rows: users } = await client.query(
      `SELECT id, email FROM users WHERE email IN ($1, $2)`,
      [email1, email2]
    );

    if (users.length !== 2) {
      console.error("❌ Both users must exist!");
      return;
    }

    const user1 = users.find(u => u.email === email1)!;
    const user2 = users.find(u => u.email === email2)!;

    console.log(`✅ Found users:`);
    console.log(`   ${user1.email} (ID: ${user1.id})`);
    console.log(`   ${user2.email} (ID: ${user2.id})`);

    // Check if partner link already exists
    const { rows: existing } = await client.query(
      `SELECT couple_id FROM partner_links 
       WHERE (user_a_id = $1 AND user_b_id = $2) 
          OR (user_a_id = $2 AND user_b_id = $1)`,
      [user1.id, user2.id]
    );

    if (existing.length > 0) {
      console.log(`\n⚠️  Partner link already exists!`);
      console.log(`   Couple ID: ${existing[0].couple_id}`);
      return;
    }

    await client.query("BEGIN");

    // Ensure consistent ordering (user_a_id < user_b_id)
    const userAId = Math.min(user1.id, user2.id);
    const userBId = Math.max(user1.id, user2.id);

    // Generate unique couple_id
    const coupleId = await generateCoupleId();
    const linkId = `plink-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.log(`\n📝 Creating partner link...`);
    console.log(`   Couple ID: ${coupleId}`);
    console.log(`   Link ID: ${linkId}`);

    // Create partner_links record
    await client.query(
      `INSERT INTO partner_links (id, couple_id, user_a_id, user_b_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [linkId, coupleId, userAId, userBId]
    );

    console.log(`✅ Partner link created!`);

    // Determine household_id (use user1's household or create new one)
    const { rows: user1Profiles } = await client.query(
      `SELECT household_id FROM profiles WHERE user_id = $1 AND role = 'self' LIMIT 1`,
      [user1.id]
    );

    const householdId = user1Profiles[0]?.household_id || householdIdForOwner(user1.id);
    console.log(`   Using household_id: ${householdId}`);

    // Update both users' self profiles with couple_id and household_id
    console.log(`\n📝 Updating profiles with couple_id...`);
    
    const { rowCount: user1Updated } = await client.query(
      `UPDATE profiles
       SET couple_id = $1, household_id = $2
       WHERE user_id = $3 AND role = 'self'`,
      [coupleId, householdId, user1.id]
    );

    const { rowCount: user2Updated } = await client.query(
      `UPDATE profiles
       SET couple_id = $1, household_id = $2
       WHERE user_id = $3 AND role = 'self'`,
      [coupleId, householdId, user2.id]
    );

    console.log(`✅ Updated ${user1Updated} profile(s) for ${email1}`);
    console.log(`✅ Updated ${user2Updated} profile(s) for ${email2}`);

    // Update partner profiles if they exist
    const { rowCount: partner1Updated } = await client.query(
      `UPDATE profiles
       SET couple_id = $1
       WHERE user_id = $2 AND role = 'partner' AND linked_user_id = $3`,
      [coupleId, user1.id, user2.id]
    );

    const { rowCount: partner2Updated } = await client.query(
      `UPDATE profiles
       SET couple_id = $1
       WHERE user_id = $2 AND role = 'partner' AND linked_user_id = $3`,
      [coupleId, user2.id, user1.id]
    );

    if (partner1Updated > 0 || partner2Updated > 0) {
      console.log(`✅ Updated ${partner1Updated + partner2Updated} partner profile(s)`);
    }

    await client.query("COMMIT");

    console.log("\n" + "=".repeat(80));
    console.log("\n✅ SUCCESS! Partner link created successfully.\n");
    console.log(`🎉 ${email1} and ${email2} are now linked as partners!`);
    console.log(`💑 Couple ID: ${coupleId}`);
    console.log(`🏠 Household ID: ${householdId}`);
    console.log("\nBoth users now have access to:");
    console.log("  ✓ Shared messages");
    console.log("  ✓ Location sharing");
    console.log("  ✓ Couple activities");
    console.log("  ✓ All couple-specific features");
    console.log("\n💡 Both users should refresh their browsers to see the changes.\n");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error creating partner link:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

createPartnerLink();
