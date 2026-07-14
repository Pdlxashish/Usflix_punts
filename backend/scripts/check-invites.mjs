import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const invites = await pool.query(`
  SELECT pi.id, pi.status, LEFT(pi.invite_code, 12) as code_prefix, pi.invited_email,
         pi.partner_user_id, pi.expires_at, cu.email as inviter_email
  FROM partner_invites pi
  JOIN clerk_users cu ON cu.user_id = pi.inviting_user_id
  ORDER BY pi.created_at DESC LIMIT 5
`);
console.log("partner_invites:", JSON.stringify(invites.rows, null, 2));

const memberships = await pool.query(`SELECT * FROM tenant_memberships`);
console.log("tenant_memberships:", JSON.stringify(memberships.rows, null, 2));

const partnerProfiles = await pool.query(`
  SELECT p.id, p.name, p.role, p.user_id, p.linked_user_id
  FROM profiles p WHERE p.role = 'partner'
`);
console.log("partner profiles:", JSON.stringify(partnerProfiles.rows, null, 2));

await pool.end();
