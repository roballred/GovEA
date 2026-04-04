'use server'

import { db } from '@/db/client'
import { personas } from '@/db/schema'

export async function getPersonas(organizationId: string) {
  return db.query.personas.findMany({
    where: (p, { eq }) => eq(p.organizationId, organizationId),
    orderBy: (p, { asc }) => [asc(p.name)],
  })
}
