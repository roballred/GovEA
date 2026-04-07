import { GOV_TAXONOMY } from './gov-taxonomy'
import { DEV_USERS, DEFAULT_PERSONA_TYPES, DEFAULT_TAGS, DEV_PERSONAS, DEV_CAPABILITIES, DEV_APPLICATIONS } from './dev-fixtures'
import { db } from '../client'
import { users, organizations, personaTypes, tags, personas, capabilities, applications, capabilityPersonas, applicationCapabilities } from '../schema'
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

    for (const name of DEFAULT_TAGS) {
      await db.insert(tags).values({ name, organizationId: orgId }).onConflictDoNothing()
    }
    console.log(`Seeded ${DEFAULT_TAGS.length} default tags`)

    // Personas
    const personaIdMap: Record<string, string> = {}
    for (const p of DEV_PERSONAS) {
      const [inserted] = await db.insert(personas).values({
        organizationId: orgId,
        name: p.name,
        description: p.description,
        type: p.type,
        status: p.status,
      }).onConflictDoNothing().returning()
      if (inserted) {
        personaIdMap[p.name] = inserted.id
      } else {
        // Already exists — look it up
        const existing = await db.query.personas.findFirst({
          where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.name, p.name)),
        })
        if (existing) personaIdMap[p.name] = existing.id
      }
    }
    console.log(`Seeded ${DEV_PERSONAS.length} dev personas`)

    // Capabilities + capability→persona links
    const capabilityIdMap: Record<string, string> = {}
    for (const c of DEV_CAPABILITIES) {
      const [inserted] = await db.insert(capabilities).values({
        organizationId: orgId,
        name: c.name,
        description: c.description,
        domain: c.domain,
        status: c.status,
      }).onConflictDoNothing().returning()

      let capId: string
      if (inserted) {
        capId = inserted.id
      } else {
        const existing = await db.query.capabilities.findFirst({
          where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.name, c.name)),
        })
        capId = existing!.id
      }
      capabilityIdMap[c.name] = capId

      for (const personaName of c.personas) {
        const personaId = personaIdMap[personaName]
        if (personaId) {
          const exists = await db.query.capabilityPersonas.findFirst({
            where: (t, { eq, and }) => and(eq(t.capabilityId, capId), eq(t.personaId, personaId)),
          })
          if (!exists) await db.insert(capabilityPersonas).values({ capabilityId: capId, personaId })
        }
      }
    }
    console.log(`Seeded ${DEV_CAPABILITIES.length} dev capabilities`)

    // Applications + application→capability links
    for (const a of DEV_APPLICATIONS) {
      const [inserted] = await db.insert(applications).values({
        organizationId: orgId,
        name: a.name,
        description: a.description,
        vendor: a.vendor,
        hostingModel: a.hostingModel,
        status: a.status,
      }).onConflictDoNothing().returning()

      let appId: string
      if (inserted) {
        appId = inserted.id
      } else {
        const existing = await db.query.applications.findFirst({
          where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.name, a.name)),
        })
        appId = existing!.id
      }

      for (const capName of a.capabilities) {
        const capId = capabilityIdMap[capName]
        if (capId) {
          const exists = await db.query.applicationCapabilities.findFirst({
            where: (t, { eq, and }) => and(eq(t.applicationId, appId), eq(t.capabilityId, capId)),
          })
          if (!exists) await db.insert(applicationCapabilities).values({ applicationId: appId, capabilityId: capId })
        }
      }
    }
    console.log(`Seeded ${DEV_APPLICATIONS.length} dev applications`)
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
