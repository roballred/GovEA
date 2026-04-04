'use server'

import { db } from '@/db/client'

export async function getApplications(organizationId: string) {
  return db.query.applications.findMany({
    where: (a, { eq }) => eq(a.organizationId, organizationId),
    with: { applicationCapabilities: { with: { capability: true } } },
    orderBy: (a, { asc }) => [asc(a.name)],
  })
}
