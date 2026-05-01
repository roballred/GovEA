/**
 * First-run setup: creates an org + initial instance admin if no users exist yet.
 * Controlled by GOVEA_SETUP_EMAIL and GOVEA_SETUP_PASSWORD env vars.
 * Safe to leave in env on subsequent runs — no-ops when users already exist.
 */
import postgres from 'postgres'
import bcrypt from 'bcryptjs'

const email = process.env.GOVEA_SETUP_EMAIL
const password = process.env.GOVEA_SETUP_PASSWORD

if (!email || !password) {
  console.error('    GOVEA_SETUP_EMAIL and GOVEA_SETUP_PASSWORD are required.')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

const [{ count }] = await sql`SELECT count(*)::int FROM users`
if (parseInt(count) > 0) {
  console.log('    Users already exist — skipping first-run setup.')
  await sql.end()
  process.exit(0)
}

// Instance admin belongs to the platform system org, not a tenant org.
// Tenant orgs are created through the instance admin panel after first login.
const [org] = await sql`
  INSERT INTO organizations (name, slug, is_system_org)
  VALUES ('GovEA Platform', 'govea-platform', true)
  RETURNING id
`

const passwordHash = await bcrypt.hash(password, 12)
await sql`
  INSERT INTO users (organization_id, email, name, password_hash, role, instance_role, is_active)
  VALUES (${org.id}, ${email}, 'Instance Admin', ${passwordHash}, 'admin', 'instance_admin', 'true')
`

console.log(`    Created system org: GovEA Platform`)
console.log(`    Created instance admin: ${email}`)
await sql.end()
