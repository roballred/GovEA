import { GOV_TAXONOMY } from './gov-taxonomy'
import { DEV_USERS, DEFAULT_PERSONA_TYPES } from './dev-fixtures'
import { db } from '../client'
import { users, organizations, personaTypes } from '../schema'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('Seeding government taxonomy...')
  console.log(`Loaded ${GOV_TAXONOMY.length} top-level domains`)

  if (process.env.DEV === 'true') {
    console.log('Loading dev fixtures...')

    let existing = await db.query.organizations.findFirst()
    let orgId: string

    if (existing) {
      orgId = existing.id
    } else {
      const [org] = await db.insert(organizations).values({
        name: 'Dev Organization',
        slug: 'dev-org',
      }).returning()
      orgId = org.id
    }

    const passwordHash = await bcrypt.hash('dev-password', 12)

    for (const u of DEV_USERS) {
      await db.insert(users).values({
        ...u,
        passwordHash,
        organizationId: orgId,
        isActive: 'true',
      }).onConflictDoNothing()
    }

    console.log(`Seeded ${DEV_USERS.length} dev users (password: dev-password)`)

    for (const name of DEFAULT_PERSONA_TYPES) {
      await db.insert(personaTypes).values({ name, organizationId: orgId }).onConflictDoNothing()
    }

    console.log(`Seeded ${DEFAULT_PERSONA_TYPES.length} default persona types`)
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
