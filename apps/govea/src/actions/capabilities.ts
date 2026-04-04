'use server'

import { db } from '@/db/client'

export async function getCapabilities(organizationId: string) {
  return db.query.capabilities.findMany({
    where: (c, { eq }) => eq(c.organizationId, organizationId),
    with: { capabilityPersonas: { with: { persona: true } } },
    orderBy: (c, { asc }) => [asc(c.name)],
  })
}
