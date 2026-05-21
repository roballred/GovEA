'use server'

import { db } from '@/db/client'
import {
  applications, applicationCapabilities, capabilities,
  initiatives, initiativeApplications,
  adrs, adrApplications,
  services, serviceCapabilities,
  auditLog,
} from '@/db/schema'
import { and, eq, inArray, desc, gt, or, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canReadFederatedEntity, getConnectedOrgIds } from '@/lib/federation'

/**
 * Application Impact Analysis (#578).
 *
 * Answers the Programme Director persona's canonical question — *"what
 * breaks if I decommission Y?"* — by aggregating the dependency information
 * that's already in the model into a single computed view. The data has
 * always been here; the gap the audit named was that nobody had assembled
 * it for delivery decision-making.
 *
 * Three computed sections, matching the persona-foundational frame:
 *
 *   1. **If you decommission this** — orphan capabilities (only this app
 *      supports them), active initiatives touching this app, replacement
 *      candidates (initiatives that `build` something while this app is
 *      `retire`d for the same capability), coverage-sharers (other apps
 *      that also serve this app's capabilities — could absorb load),
 *      services that route through this app's capabilities.
 *   2. **What this depends on** — capabilities required for this app to
 *      deliver business value; ADRs that constrain it. Currently
 *      app-to-app technology dependencies aren't modeled in GovEA, so this
 *      section is the union of linked capabilities + ADRs framed for
 *      delivery-sequencing context.
 *   3. **Last changed** — recent audit events for this app and any
 *      directly-linked entity. Surfaces the "this just changed — re-check
 *      my plan" signal.
 *
 * Federation / RBAC: respects the same visibility rules as `getApplication()`
 * — viewer sees only published items in the analysis; cross-org rows are
 * filtered to ones the caller can read.
 */

export type ImpactCapability = {
  id: string
  name: string
  domain: string | null
  /** Number of *other* applications also serving this capability in the caller's view. */
  otherSupportingAppCount: number
  /** Is this capability fully orphaned if the source app decommissions? */
  isOrphanCandidate: boolean
}

export type ImpactInitiative = {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  impact: string | null // build / improve / retire / migrate
}

export type ImpactReplacement = {
  initiativeId: string
  initiativeName: string
  replacementAppId: string | null
  replacementAppName: string | null
  capabilityName: string
  initiativeStatus: string
  initiativeEndDate: string | null
}

export type ImpactCoverageSharer = {
  id: string
  name: string
  lifecycleStatus: string
  sharedCapabilities: { id: string; name: string }[]
}

export type ImpactAdr = {
  id: string
  number: string
  title: string
  status: string
}

export type ImpactService = {
  id: string
  name: string
  description: string | null
  /** The capability path through which this service depends on the source app. */
  viaCapabilities: { id: string; name: string }[]
}

export type ImpactRecentChange = {
  entityType: string
  entityId: string | null
  action: string
  actorEmail: string | null
  createdAt: Date
}

export type ApplicationImpactAnalysis = {
  application: {
    id: string
    name: string
    lifecycleStatus: string
    organizationId: string
  }
  capabilities: ImpactCapability[]
  initiatives: ImpactInitiative[]
  replacements: ImpactReplacement[]
  coverageSharers: ImpactCoverageSharer[]
  adrs: ImpactAdr[]
  services: ImpactService[]
  recentChanges: ImpactRecentChange[]
  /** Useful headline for the page summary. */
  summary: {
    orphanCount: number
    activeInitiativeCount: number
    replacementInProgress: boolean
    coverageSharerCount: number
    serviceCount: number
    recentChangeCount: number
  }
}

const RECENT_CHANGE_WINDOW_DAYS = 30
const REPLACEMENT_LABELS = ['build', 'migrate']
const RETIRE_LABEL = 'retire'

export async function getApplicationImpactAnalysis(id: string): Promise<ApplicationImpactAnalysis | null> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orgId = session.user.organizationId!
  const isViewer = session.user.role === 'viewer'

  // Anchor: the application itself, gated through the same federation +
  // viewer rules as getApplication().
  const application = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    columns: { id: true, name: true, lifecycleStatus: true, status: true, visibility: true, organizationId: true },
  })
  if (!application) return null
  const visible = await canReadFederatedEntity(application.organizationId, application.visibility, orgId)
  if (!visible) return null
  if (isViewer && application.status !== 'published') return null

  // Linked capabilities to this app — the spine of the analysis.
  const appCapJunctions = await db.select({
    capabilityId: applicationCapabilities.capabilityId,
  }).from(applicationCapabilities).where(eq(applicationCapabilities.applicationId, id))
  const linkedCapabilityIds = appCapJunctions.map(r => r.capabilityId)

  // For each linked capability:
  //   - count *other* supporting applications (whose lifecycleStatus isn't
  //     already 'decommissioned' — a decommissioned app counted as "support"
  //     would be misleading for delivery planning).
  //   - resolve its name + domain for display.
  //   - federation: include cross-org apps the caller can read by joining
  //     applications and filtering server-side after the query.
  const connectedOrgIds = await getConnectedOrgIds(orgId)
  const capabilities_: ImpactCapability[] = []
  for (const capId of linkedCapabilityIds) {
    const [capRow, otherApps] = await Promise.all([
      db.query.capabilities.findFirst({
        where: eq(capabilities.id, capId),
        columns: { id: true, name: true, domain: true, status: true, visibility: true, organizationId: true },
      }),
      db.query.applicationCapabilities.findMany({
        where: and(
          eq(applicationCapabilities.capabilityId, capId),
          ne(applicationCapabilities.applicationId, id),
        ),
        with: {
          application: {
            columns: { id: true, name: true, lifecycleStatus: true, status: true, visibility: true, organizationId: true },
          },
        },
      }),
    ])
    if (!capRow) continue
    const capVisible = await canReadFederatedEntity(capRow.organizationId, capRow.visibility, orgId)
    if (!capVisible) continue
    if (isViewer && capRow.status !== 'published') continue

    // Filter "other supporting apps" to ones the caller can read AND aren't
    // already decommissioned (a decommissioned app doesn't actually support
    // anything from a delivery-planning standpoint).
    const visibleOthers: typeof otherApps = []
    for (const oa of otherApps) {
      const app = oa.application
      if (app.lifecycleStatus === 'decommissioned') continue
      if (isViewer && app.status !== 'published') continue
      const v = await canReadFederatedEntity(app.organizationId, app.visibility, orgId)
      if (!v) continue
      visibleOthers.push(oa)
    }

    capabilities_.push({
      id: capRow.id,
      name: capRow.name,
      domain: capRow.domain,
      otherSupportingAppCount: visibleOthers.length,
      isOrphanCandidate: visibleOthers.length === 0,
    })
  }

  // Initiatives touching this app, with impact labels.
  const initiativeJunctions = await db.query.initiativeApplications.findMany({
    where: eq(initiativeApplications.applicationId, id),
    with: {
      initiative: {
        columns: { id: true, name: true, status: true, startDate: true, endDate: true, organizationId: true, visibility: true },
      },
    },
  })
  // Federation filter on the initiative side too.
  const visibleInitiativeJunctions: typeof initiativeJunctions = []
  for (const ij of initiativeJunctions) {
    const v = await canReadFederatedEntity(ij.initiative.organizationId, ij.initiative.visibility, orgId)
    if (!v) continue
    if (isViewer && !['active', 'complete'].includes(ij.initiative.status)) continue
    visibleInitiativeJunctions.push(ij)
  }
  const initiativesList: ImpactInitiative[] = visibleInitiativeJunctions.map(ij => ({
    id: ij.initiative.id,
    name: ij.initiative.name,
    status: ij.initiative.status,
    startDate: ij.initiative.startDate,
    endDate: ij.initiative.endDate,
    impact: ij.impact ?? null,
  }))

  // Replacement candidates: for each initiative that retires this app, look
  // for *another* initiative-application link on the SAME initiative where
  // the other app has impact=build|migrate AND shares at least one linked
  // capability with this app. The matched pair = "replacement in flight".
  const retireInitiativeIds = visibleInitiativeJunctions
    .filter(ij => ij.impact === RETIRE_LABEL)
    .map(ij => ij.initiative.id)

  const replacements: ImpactReplacement[] = []
  if (retireInitiativeIds.length > 0 && linkedCapabilityIds.length > 0) {
    const candidateLinks = await db.query.initiativeApplications.findMany({
      where: and(
        inArray(initiativeApplications.initiativeId, retireInitiativeIds),
        ne(initiativeApplications.applicationId, id),
        inArray(initiativeApplications.impact, REPLACEMENT_LABELS),
      ),
      with: {
        initiative: { columns: { id: true, name: true, status: true, endDate: true, organizationId: true, visibility: true } },
        application: { columns: { id: true, name: true, organizationId: true, visibility: true, status: true } },
      },
    })
    // Cross-check shared capability.
    for (const cand of candidateLinks) {
      // Filter visibility
      const initV = await canReadFederatedEntity(cand.initiative.organizationId, cand.initiative.visibility, orgId)
      const appV = await canReadFederatedEntity(cand.application.organizationId, cand.application.visibility, orgId)
      if (!initV || !appV) continue
      if (isViewer && !['active', 'complete'].includes(cand.initiative.status)) continue
      if (isViewer && cand.application.status !== 'published') continue

      // Does the candidate app cover any of the source app's capabilities?
      const candCaps = await db.select({ capabilityId: applicationCapabilities.capabilityId })
        .from(applicationCapabilities)
        .where(and(
          eq(applicationCapabilities.applicationId, cand.application.id),
          inArray(applicationCapabilities.capabilityId, linkedCapabilityIds),
        ))
      if (candCaps.length === 0) continue
      // Look up first matching capability name
      const firstCap = await db.query.capabilities.findFirst({
        where: eq(capabilities.id, candCaps[0].capabilityId),
        columns: { name: true },
      })
      replacements.push({
        initiativeId: cand.initiative.id,
        initiativeName: cand.initiative.name,
        replacementAppId: cand.application.id,
        replacementAppName: cand.application.name,
        capabilityName: firstCap?.name ?? '(unknown)',
        initiativeStatus: cand.initiative.status,
        initiativeEndDate: cand.initiative.endDate,
      })
    }
  }

  // Coverage-sharers: other apps that also serve at least one of this app's
  // capabilities (excluding ones already classified as replacement
  // candidates so the same app doesn't appear in both lists).
  const replacementAppIds = new Set(
    replacements.map(r => r.replacementAppId).filter((x): x is string => x !== null),
  )
  const coverageSharers: ImpactCoverageSharer[] = []
  if (linkedCapabilityIds.length > 0) {
    const sharingLinks = await db.query.applicationCapabilities.findMany({
      where: and(
        inArray(applicationCapabilities.capabilityId, linkedCapabilityIds),
        ne(applicationCapabilities.applicationId, id),
      ),
      with: {
        application: {
          columns: { id: true, name: true, lifecycleStatus: true, status: true, visibility: true, organizationId: true },
        },
        capability: { columns: { id: true, name: true } },
      },
    })
    const byApp = new Map<string, ImpactCoverageSharer>()
    for (const link of sharingLinks) {
      const a = link.application
      if (replacementAppIds.has(a.id)) continue
      if (a.lifecycleStatus === 'decommissioned') continue
      if (isViewer && a.status !== 'published') continue
      const v = await canReadFederatedEntity(a.organizationId, a.visibility, orgId)
      if (!v) continue

      const existing = byApp.get(a.id) ?? {
        id: a.id, name: a.name, lifecycleStatus: a.lifecycleStatus, sharedCapabilities: [],
      }
      if (!existing.sharedCapabilities.some(c => c.id === link.capability.id)) {
        existing.sharedCapabilities.push({ id: link.capability.id, name: link.capability.name })
      }
      byApp.set(a.id, existing)
    }
    coverageSharers.push(...byApp.values())
  }

  // ADRs that reference this app.
  const adrLinks = await db.query.adrApplications.findMany({
    where: eq(adrApplications.applicationId, id),
    with: {
      adr: { columns: { id: true, number: true, title: true, status: true, organizationId: true, visibility: true } },
    },
  })
  const visibleAdrs: ImpactAdr[] = []
  for (const al of adrLinks) {
    const v = await canReadFederatedEntity(al.adr.organizationId, al.adr.visibility, orgId)
    if (!v) continue
    visibleAdrs.push({
      id: al.adr.id, number: al.adr.number, title: al.adr.title, status: al.adr.status,
    })
  }

  // Services that route through any of this app's capabilities (downstream
  // visibility for delivery planning — "what citizen-facing services break
  // if this app goes away?").
  const servicesList: ImpactService[] = []
  if (linkedCapabilityIds.length > 0) {
    const svcLinks = await db.query.serviceCapabilities.findMany({
      where: inArray(serviceCapabilities.capabilityId, linkedCapabilityIds),
      with: {
        service: { columns: { id: true, name: true, description: true, status: true, visibility: true, organizationId: true } },
        capability: { columns: { id: true, name: true } },
      },
    })
    const bySvc = new Map<string, ImpactService>()
    for (const link of svcLinks) {
      const s = link.service
      if (isViewer && s.status !== 'published') continue
      const v = await canReadFederatedEntity(s.organizationId, s.visibility, orgId)
      if (!v) continue
      const existing = bySvc.get(s.id) ?? {
        id: s.id, name: s.name, description: s.description, viaCapabilities: [],
      }
      if (!existing.viaCapabilities.some(c => c.id === link.capability.id)) {
        existing.viaCapabilities.push({ id: link.capability.id, name: link.capability.name })
      }
      bySvc.set(s.id, existing)
    }
    servicesList.push(...bySvc.values())
  }

  // Last changed: audit events for this app + any linked capability /
  // initiative / ADR, scoped to the org, in the recent window.
  // eslint-disable-next-line react-hooks/purity -- server action, Date.now() is intentional
  const windowStart = new Date(Date.now() - RECENT_CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const relevantEntityIds = [
    id,
    ...linkedCapabilityIds,
    ...visibleInitiativeJunctions.map(ij => ij.initiative.id),
    ...visibleAdrs.map(a => a.id),
  ]
  const recentChanges: ImpactRecentChange[] = []
  if (relevantEntityIds.length > 0) {
    const rows = await db.select({
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      action: auditLog.action,
      createdAt: auditLog.createdAt,
    })
      .from(auditLog)
      .where(and(
        eq(auditLog.organizationId, application.organizationId),
        gt(auditLog.createdAt, windowStart),
        inArray(auditLog.entityId, relevantEntityIds),
      ))
      .orderBy(desc(auditLog.createdAt))
      .limit(20)
    recentChanges.push(...rows.map(r => ({
      entityType: r.entityType,
      entityId: r.entityId,
      action: r.action,
      actorEmail: null, // join to users out of scope for v1 — saves a column
      createdAt: r.createdAt,
    })))
    void or  // dependency on eq/or imports for the query helper — silence unused warning
  }

  return {
    application: {
      id: application.id,
      name: application.name,
      lifecycleStatus: application.lifecycleStatus,
      organizationId: application.organizationId,
    },
    capabilities: capabilities_,
    initiatives: initiativesList,
    replacements,
    coverageSharers,
    adrs: visibleAdrs,
    services: servicesList,
    recentChanges,
    summary: {
      orphanCount: capabilities_.filter(c => c.isOrphanCandidate).length,
      activeInitiativeCount: initiativesList.filter(i => i.status === 'active').length,
      replacementInProgress: replacements.length > 0,
      coverageSharerCount: coverageSharers.length,
      serviceCount: servicesList.length,
      recentChangeCount: recentChanges.length,
    },
  }
}
