'use server'

import { db } from '@/db/client'

export async function getTaxonomyTerms(organizationId: string) {
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq }) => eq(t.organizationId, organizationId),
    orderBy: (t, { asc }) => [asc(t.domain), asc(t.sortOrder), asc(t.name)],
  })
}

/** Returns only top-level taxonomy terms (parentId IS NULL) — used as domain options. */
export async function getTaxonomyDomains(organizationId: string) {
  return db.query.taxonomyTerms.findMany({
    where: (t, { eq, isNull, and }) => and(eq(t.organizationId, organizationId), isNull(t.parentId)),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  })
}
