'use server'

import { db } from '@/db/client'
import { serviceCapabilities } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export type AnswerItem = {
  id: string
  title: string
  description: string | null
  href: string
  relevance: string
  status: string
  entityType: string
}

export type AnswerSection = {
  heading: string
  subheading: string
  items: AnswerItem[]
}

export type AnswerContent = {
  query: string
  sections: AnswerSection[]
}

const VIEWER_INITIATIVE_STATUSES = ['active', 'complete'] as const

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function getAnswerContent(query: string): Promise<AnswerContent> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  if (!query || query.trim().length < 2) {
    return { query, sections: [] }
  }

  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'
  const q = `%${query.trim()}%`

  // Primary: matching capabilities with all relevant relationships
  const matchedCaps = await db.query.capabilities.findMany({
    where: (c, { eq, and, or, ilike }) =>
      and(
        eq(c.organizationId, orgId),
        or(ilike(c.name, q), ilike(c.description, q)),
        isViewer ? eq(c.status, 'published') : undefined,
      ),
    with: {
      applicationCapabilities: { with: { application: true } },
      initiativeCapabilities: { with: { initiative: true } },
      objectiveCapabilities: { with: { objective: true } },
    },
  })

  const matchedCapIds = matchedCaps.map(c => c.id)

  // Direct matches for other types + services linked to matched capabilities
  const [matchedServices, matchedObjectives, matchedInitiatives, linkedServiceRows] =
    await Promise.all([
      db.query.services.findMany({
        where: (s, { eq, and, or, ilike }) =>
          and(
            eq(s.organizationId, orgId),
            or(ilike(s.name, q), ilike(s.description, q)),
            isViewer ? eq(s.status, 'published') : undefined,
          ),
      }),
      db.query.strategicObjectives.findMany({
        where: (o, { eq, and, or, ilike }) =>
          and(
            eq(o.organizationId, orgId),
            or(ilike(o.name, q), ilike(o.description, q)),
            isViewer ? eq(o.status, 'published') : undefined,
          ),
      }),
      db.query.initiatives.findMany({
        where: (i, { eq, and, or, ilike, inArray }) =>
          and(
            eq(i.organizationId, orgId),
            or(ilike(i.name, q), ilike(i.description, q)),
            isViewer ? inArray(i.status, [...VIEWER_INITIATIVE_STATUSES]) : undefined,
          ),
      }),
      matchedCapIds.length > 0
        ? db
            .select()
            .from(serviceCapabilities)
            .where(inArray(serviceCapabilities.capabilityId, matchedCapIds))
        : Promise.resolve([] as (typeof serviceCapabilities.$inferSelect)[]),
    ])

  // Fetch service records for linked service IDs
  const linkedServiceIds = [...new Set(linkedServiceRows.map(r => r.serviceId))]
  const linkedServices =
    linkedServiceIds.length > 0
      ? await db.query.services.findMany({
          where: (s, { inArray }) => inArray(s.id, linkedServiceIds),
        })
      : []

  // ── Capabilities ──────────────────────────────────────────────────────────
  const capItems: AnswerItem[] = matchedCaps.map(c => ({
    id: c.id,
    title: c.name,
    description: c.description,
    href: `/capabilities/${c.id}`,
    relevance: `Matches "${query.trim()}" in its name or description`,
    status: c.status,
    entityType: 'capability',
  }))

  // ── Applications (via capabilities) ───────────────────────────────────────
  const appMap = new Map<string, AnswerItem>()
  for (const cap of matchedCaps) {
    for (const { application } of cap.applicationCapabilities) {
      if (isViewer && application.status !== 'published') continue
      if (!appMap.has(application.id)) {
        appMap.set(application.id, {
          id: application.id,
          title: application.name,
          description: application.description,
          href: `/applications/${application.id}`,
          relevance: `Supports the ${cap.name} capability`,
          status: application.status,
          entityType: 'application',
        })
      }
    }
  }
  const appItems = Array.from(appMap.values())

  // ── Initiatives (via capabilities + direct) ───────────────────────────────
  const initiativeMap = new Map<string, AnswerItem>()
  for (const cap of matchedCaps) {
    for (const { initiative, impact } of cap.initiativeCapabilities) {
      if (
        isViewer &&
        !VIEWER_INITIATIVE_STATUSES.includes(
          initiative.status as (typeof VIEWER_INITIATIVE_STATUSES)[number],
        )
      )
        continue
      if (!initiativeMap.has(initiative.id)) {
        initiativeMap.set(initiative.id, {
          id: initiative.id,
          title: initiative.name,
          description: initiative.description,
          href: `/initiatives/${initiative.id}`,
          relevance: impact
            ? `${capitalize(impact)}s the ${cap.name} capability`
            : `Affects the ${cap.name} capability`,
          status: initiative.status,
          entityType: 'initiative',
        })
      }
    }
  }
  for (const init of matchedInitiatives) {
    if (!initiativeMap.has(init.id)) {
      initiativeMap.set(init.id, {
        id: init.id,
        title: init.name,
        description: init.description,
        href: `/initiatives/${init.id}`,
        relevance: `Matches "${query.trim()}" in its name or description`,
        status: init.status,
        entityType: 'initiative',
      })
    }
  }
  const initiativeItems = Array.from(initiativeMap.values())

  // ── Objectives (via capabilities + direct) ────────────────────────────────
  const objectiveMap = new Map<string, AnswerItem>()
  for (const cap of matchedCaps) {
    for (const { objective } of cap.objectiveCapabilities) {
      if (isViewer && objective.status !== 'published') continue
      if (!objectiveMap.has(objective.id)) {
        objectiveMap.set(objective.id, {
          id: objective.id,
          title: objective.name,
          description: objective.description,
          href: `/objectives/${objective.id}`,
          relevance: `Linked to the ${cap.name} capability`,
          status: objective.status,
          entityType: 'objective',
        })
      }
    }
  }
  for (const obj of matchedObjectives) {
    if (!objectiveMap.has(obj.id)) {
      objectiveMap.set(obj.id, {
        id: obj.id,
        title: obj.name,
        description: obj.description,
        href: `/objectives/${obj.id}`,
        relevance: `Matches "${query.trim()}" in its name or description`,
        status: obj.status,
        entityType: 'objective',
      })
    }
  }
  const objectiveItems = Array.from(objectiveMap.values())

  // ── Services (direct + via capabilities) ──────────────────────────────────
  const serviceMap = new Map<string, AnswerItem>()
  for (const svc of matchedServices) {
    serviceMap.set(svc.id, {
      id: svc.id,
      title: svc.name,
      description: svc.description,
      href: `/services/${svc.id}`,
      relevance: `Matches "${query.trim()}" in its name or description`,
      status: svc.status,
      entityType: 'service',
    })
  }
  for (const row of linkedServiceRows) {
    const svc = linkedServices.find(s => s.id === row.serviceId)
    if (!svc) continue
    if (isViewer && svc.status !== 'published') continue
    if (!serviceMap.has(svc.id)) {
      const cap = matchedCaps.find(c => c.id === row.capabilityId)
      serviceMap.set(svc.id, {
        id: svc.id,
        title: svc.name,
        description: svc.description,
        href: `/services/${svc.id}`,
        relevance: cap
          ? `Delivers the ${cap.name} capability to stakeholders`
          : 'Linked to a matching capability',
        status: svc.status,
        entityType: 'service',
      })
    }
  }
  const serviceItems = Array.from(serviceMap.values())

  // ── Assemble sections (omit empty) ────────────────────────────────────────
  const sections: AnswerSection[] = []

  if (capItems.length > 0) {
    sections.push({
      heading: 'Capabilities',
      subheading: 'What the organization is able to do in this area',
      items: capItems,
    })
  }
  if (serviceItems.length > 0) {
    sections.push({
      heading: 'Services',
      subheading: 'How this area is delivered to stakeholders and the public',
      items: serviceItems,
    })
  }
  if (appItems.length > 0) {
    sections.push({
      heading: 'Technology',
      subheading: 'Systems and applications that support these capabilities',
      items: appItems,
    })
  }
  if (initiativeItems.length > 0) {
    sections.push({
      heading: 'Active Initiatives',
      subheading: 'Work underway that affects this area',
      items: initiativeItems,
    })
  }
  if (objectiveItems.length > 0) {
    sections.push({
      heading: 'Strategic Objectives',
      subheading: 'Mission and strategy this area supports',
      items: objectiveItems,
    })
  }

  return { query, sections }
}
