/**
 * Diagnostic script to check partner linking status
 * Usage: tsx backend/scripts/check-partner-link-status.ts
 */
import pool from "../src/db/connection.js";

async function checkPartnerLinkStatus() {
  console.log("\n🔍 CHECKING PARTNER LINK STATUS\n");
  console.log("=".repeat(80));

  const email1 = "poudelashish0718@gmail.com";
  const email2 = "punts1803@gmail.com";

  try {
    // 1. Check if users exist
    console.log("\n📧 Step 1: Checking if users exist...");
    const { rows: users } = await pool.query(
      `SELECT id, email, display_name, auth_provider, created_at 
       FROM users 
       WHERE email IN ($1, $2)
       ORDER BY email`,
      [email1, email2]
    );

    if (users.length === 0) {
      console.log("❌ No users found with these emails!");
      return;
    }

    console.log(`✅ Found ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`   - ${u.email} (ID: ${u.id}, Provider: ${u.auth_provider})`);
    });

    const user1 = users.find(u => u.email === email1);
    const user2 = users.find(u => u.email === email2);

    if (!user1) {
      console.log(`❌ User ${email1} not found!`);
      return;
    }
    if (!user2) {
      console.log(`❌ User ${email2} not found!`);
      return;
    }

    // 2. Check Clerk users table
    console.log("\n🔐 Step 2: Checking Clerk users...");
    const { rows: clerkUsers } = await pool.query(
      `SELECT clerk_id, user_id, email, display_name 
       FROM clerk_users 
       WHERE user_id IN ($1, $2)`,
      [user1.id, user2.id]
    );

    if (clerkUsers.length > 0) {
      console.log(`✅ Found ${clerkUsers.length} Clerk user(s):`);
      clerkUsers.forEach(cu => {
        console.log(`   - ${cu.email} → user_id: ${cu.user_id}`);
      });
    } else {
      console.log("⚠️  No Clerk users found (might be using email/password auth)");
    }

    // 3. Check profiles for both users
    console.log("\n👤 Step 3: Checking profiles...");
    const { rows: profiles } = await pool.query(
      `SELECT id, user_id, name, role, couple_id, household_id, linked_user_id, created_at
       FROM profiles 
       WHERE user_id IN ($1, $2)
       ORDER BY user_id, role, created_at`,
      [user1.id, user2.id]
    );

    console.log(`✅ Found ${profiles.length} profile(s):`);
    profiles.forEach(p => {
      const owner = p.user_id === user1.id ? email1 : email2;
      console.log(`   - Profile "${p.name}" (${p.id})`);
      console.log(`     Owner: ${owner} (user_id: ${p.user_id})`);
      console.log(`     Role: ${p.role}`);
      console.log(`     Couple ID: ${p.couple_id || 'NULL'}`);
      console.log(`     Household ID: ${p.household_id || 'NULL'}`);
      console.log(`     Linked User ID: ${p.linked_user_id || 'NULL'}`);
    });

    // 4. Check user_profiles junction table
    console.log("\n🔗 Step 4: Checking user_profiles junction table...");
    const { rows: userProfiles } = await pool.query(
      `SELECT up.user_id, up.profile_id, up.is_primary, p.name, p.role
       FROM user_profiles up
       JOIN profiles p ON p.id = up.profile_id
       WHERE up.user_id IN ($1, $2)
       ORDER BY up.user_id, up.is_primary DESC`,
      [user1.id, user2.id]
    );

    console.log(`✅ Found ${userProfiles.length} user-profile link(s):`);
    userProfiles.forEach(up => {
      const owner = up.user_id === user1.id ? email1 : email2;
      console.log(`   - ${owner} → Profile "${up.name}" (${up.profile_id})`);
      console.log(`     Primary: ${up.is_primary}, Role: ${up.role}`);
    });

    // 5. Check partner_links table
    console.log("\n💑 Step 5: Checking partner_links table...");
    const { rows: partnerLinks } = await pool.query(
      `SELECT id, couple_id, user_a_id, user_b_id, created_at
       FROM partner_links 
       WHERE user_a_id IN ($1, $2) OR user_b_id IN ($1, $2)`,
      [user1.id, user2.id]
    );

    if (partnerLinks.length === 0) {
      console.log("❌ NO PARTNER LINK FOUND!");
      console.log("\n⚠️  ISSUE IDENTIFIED: These users are NOT linked as partners.");
      console.log("   They need to complete the partner invitation flow:");
      console.log(`   1. ${email1} sends invitation to ${email2}`);
      console.log(`   2. ${email2} accepts the invitation`);
      console.log("   3. This creates the partner_links record");
    } else {
      console.log(`✅ Found ${partnerLinks.length} partner link(s):`);
      partnerLinks.forEach(pl => {
        console.log(`   - Link ID: ${pl.id}`);
        console.log(`     Couple ID: ${pl.couple_id}`);
        console.log(`     User A: ${pl.user_a_id} (${pl.user_a_id === user1.id ? email1 : email2})`);
        console.log(`     User B: ${pl.user_b_id} (${pl.user_b_id === user1.id ? email1 : email2})`);
        console.log(`     Created: ${pl.created_at}`);
      });
    }

    // 6. Check invitations table (if it exists)
    console.log("\n📨 Step 6: Checking invitations (if table exists)...");
    try {
      const { rows: invitations } = await pool.query(
        `SELECT id, inviter_id, invitee_email, status, created_at, accepted_at
         FROM invitations 
         WHERE inviter_id IN ($1, $2) OR invitee_email IN ($3, $4)
         ORDER BY created_at DESC`,
        [user1.id, user2.id, email1, email2]
      );

      if (invitations.length === 0) {
        console.log("⚠️  No invitations found");
      } else {
        console.log(`✅ Found ${invitations.length} invitation(s):`);
        invitations.forEach(inv => {
          const inviter = inv.inviter_id === user1.id ? email1 : email2;
          console.log(`   - From: ${inviter} → To: ${inv.invitee_email}`);
          console.log(`     Status: ${inv.status}`);
          console.log(`     Created: ${inv.created_at}`);
          console.log(`     Accepted: ${inv.accepted_at || 'N/A'}`);
        });
      }
    } catch (err: any) {
      if (err.code === '42P01') {
        console.log("⚠️  Invitations table doesn't exist (using partner_links directly)");
      } else {
        throw err;
      }
    }

    // 7. Summary and recommendations
    console.log("\n" + "=".repeat(80));
    console.log("\n📊 SUMMARY:\n");

    const user1Profiles = profiles.filter(p => p.user_id === user1.id);
    const user2Profiles = profiles.filter(p => p.user_id === user2.id);
    const hasCoupleId = profiles.some(p => p.couple_id != null);
    const hasPartnerLink = partnerLinks.length > 0;

    console.log(`✓ ${email1}:`);
    console.log(`  - User ID: ${user1.id}`);
    console.log(`  - Profiles: ${user1Profiles.length}`);
    console.log(`  - Has couple_id: ${user1Profiles.some(p => p.couple_id) ? 'YES' : 'NO'}`);

    console.log(`\n✓ ${email2}:`);
    console.log(`  - User ID: ${user2.id}`);
    console.log(`  - Profiles: ${user2Profiles.length}`);
    console.log(`  - Has couple_id: ${user2Profiles.some(p => p.couple_id) ? 'YES' : 'NO'}`);

    console.log(`\n✓ Partner Link Status: ${hasPartnerLink ? '✅ LINKED' : '❌ NOT LINKED'}`);

    if (!hasPartnerLink) {
      console.log("\n🔧 RECOMMENDED ACTIONS:\n");
      console.log("1. Check the invitations table to see if an invitation was sent/accepted");
      console.log("2. If invitation exists with status='accepted' but no partner_link:");
      console.log("   → There's a bug in the invitation acceptance flow");
      console.log("   → Run the fix script to create the missing partner_link");
      console.log("3. If no invitation exists:");
      console.log(`   → ${email1} needs to send an invitation to ${email2}`);
      console.log(`   → ${email2} needs to accept it from their dashboard`);
      console.log("\n💡 To manually create a partner link, you can run:");
      console.log(`   tsx backend/scripts/manual-partner-link.ts ${user1.id} ${user2.id}`);
    } else {
      console.log("\n✅ Partner link exists! Both users should have access to shared features.");
      
      if (!hasCoupleId) {
        console.log("\n⚠️  WARNING: Partner link exists but profiles don't have couple_id!");
        console.log("   This might cause issues. Run the fix script to update profiles.");
      }
    }

  } catch (error) {
    console.error("\n❌ Error checking partner link status:", error);
  } finally {
    await pool.end();
  }
}

checkPartnerLinkStatus();
