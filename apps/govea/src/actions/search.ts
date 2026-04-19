'use server'

import { db } from '@/db/client'
import {
  personas,
  capabilities,
  applications,
  services,
  valueStreams,
  principles,
  glossaryTerms,
  strategicObjectives,
  adrs,
  initiatives,
} from '@/db/schema'
import { ilike, eq, and, or, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export type SearchResult = {
  entityType: string
  id: string
  title: string
  status: string
  href: string
}

export async function searchRepository(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const role = session.user.role
  const isViewer = role === 'viewer'
  const q = `%${query.trim()}%`

  const [
    personaRows,
    capabilityRows,
    applicationRows,
    serviceRows,
    valueStreamRows,
    principleRows,
    glossaryRows,
    objectiveRows,
    adrRows,
    initiativeRows,
  ] = await Promise.all([
    // personas
    db
      .select({ id: personas.id, title: personas.name, status: personas.status })
      .from(personas)
      .where(
        and(
          eq(personas.organizationId, orgId),
          or(ilike(personas.name, q), ilike(personas.description, q)),
          isViewer ? eq(personas.status, 'published') : undefined
        )
      ),

    // capabilities
    db
      .select({ id: capabilities.id, title: capabilities.name, status: capabilities.status })
      .from(capabilities)
      .where(
        and(
          eq(capabilities.organizationId, orgId),
          or(ilike(capabilities.name, q), ilike(capabilities.description, q)),
          isViewer ? eq(capabilities.status, 'published') : undefined
        )
      ),

    // applications
    db
      .select({ id: applications.id, title: applications.name, status: applications.status })
      .from(applications)
      .where(
        and(
          eq(applications.organizationId, orgId),
          or(ilike(applications.name, q), ilike(applications.description, q)),
          isViewer ? eq(applications.status, 'published') : undefined
        )
      ),

    // services
    db
      .select({ id: services.id, title: services.name, status: services.status })
      .from(services)
      .where(
        and(
          eq(services.organizationId, orgId),
          or(ilike(services.name, q), ilike(services.description, q)),
          isViewer ? eq(services.status, 'published') : undefined
        )
      ),

    // value streams
    db
      .select({ id: valueStreams.id, title: valueStreams.name, status: valueStreams.status })
      .from(valueStreams)
      .where(
        and(
          eq(valueStreams.organizationId, orgId),
          or(ilike(valueStreams.name, q), ilike(valueStreams.description, q)),
          isViewer ? eq(valueStreams.status, 'published') : undefined
        )
      ),

    // principles
    db
      .select({ id: principles.id, title: principles.name, status: principles.status })
      .from(principles)
      .where(
        and(
          eq(principles.organizationId, orgId),
          or(ilike(principles.name, q), ilike(principles.description, q)),
          isViewer ? eq(principles.status, 'published') : undefined
        )
      ),

    // glossary terms
    db
      .select({ id: glossaryTerms.id, title: glossaryTerms.term, status: glossaryTerms.status })
      .from(glossaryTerms)
      .where(
        and(
          eq(glossaryTerms.organizationId, orgId),
          or(ilike(glossaryTerms.term, q), ilike(glossaryTerms.definition, q)),
          isViewer ? eq(glossaryTerms.status, 'published') : undefined
        )
      ),

    // strategic objectives
    db
      .select({ id: strategicObjectives.id, title: strategicObjectives.name, status: strategicObjectives.status })
      .from(strategicObjectives)
      .where(
        and(
          eq(strategicObjectives.organizationId, orgId),
          or(ilike(strategicObjectives.name, q), ilike(strategicObjectives.description, q)),
          isViewer ? eq(strategicObjectives.status, 'published') : undefined
        )
      ),

    // ADRs — accepted only for viewers
    db
      .select({ id: adrs.id, title: adrs.title, status: adrs.status })
      .from(adrs)
      .where(
        and(
          eq(adrs.organizationId, orgId),
          ilike(adrs.title, q),
          isViewer ? eq(adrs.status, 'accepted') : undefined
        )
      ),

    // initiatives — active/complete only for viewers
    db
      .select({ id: initiatives.id, title: initiatives.name, status: initiatives.status })
      .from(initiatives)
      .where(
        and(
          eq(initiatives.organizationId, orgId),
          or(ilike(initiatives.name, q), ilike(initiatives.description, q)),
          isViewer ? inArray(initiatives.status, ['active', 'complete']) : undefined
        )
      ),
  ])

  const results: SearchResult[] = [
    ...personaRows.map(r => ({ entityType: 'persona', id: r.id, title: r.title, status: r.status, href: `/personas/${r.id}` })),
    ...capabilityRows.map(r => ({ entityType: 'capability', id: r.id, title: r.title, status: r.status, href: `/capabilities/${r.id}` })),
    ...applicationRows.map(r => ({ entityType: 'application', id: r.id, title: r.title, status: r.status, href: `/applications/${r.id}` })),
    ...serviceRows.map(r => ({ entityType: 'service', id: r.id, title: r.title, status: r.status, href: `/services/${r.id}` })),
    ...valueStreamRows.map(r => ({ entityType: 'value stream', id: r.id, title: r.title, status: r.status, href: `/value-streams/${r.id}` })),
    ...principleRows.map(r => ({ entityType: 'principle', id: r.id, title: r.title, status: r.status, href: `/principles/${r.id}` })),
    ...glossaryRows.map(r => ({ entityType: 'glossary term', id: r.id, title: r.title, status: r.status, href: `/glossary/${r.id}` })),
    ...objectiveRows.map(r => ({ entityType: 'objective', id: r.id, title: r.title, status: r.status, href: `/objectives/${r.id}` })),
    ...adrRows.map(r => ({ entityType: 'decision', id: r.id, title: r.title, status: r.status, href: `/adrs/${r.id}` })),
    ...initiativeRows.map(r => ({ entityType: 'initiative', id: r.id, title: r.title, status: r.status, href: `/initiatives/${r.id}` })),
  ]

  return results
}
