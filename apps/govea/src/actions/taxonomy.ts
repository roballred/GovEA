'use server'

import { db } from '@/db/client'

export async function getTaxonomyTerms(organizationId: string) {
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq }) => eq(t.organizationId, organizationId),
    orderBy: (t, { asc }) => [asc(t.domain), asc(t.sortOrder), asc(t.name)],
  })
}
