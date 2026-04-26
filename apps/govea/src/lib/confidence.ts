import { db } from '@/db/client'
import {
  organizations,
  capabilities, applications, personas, valueStreams,
  strategicObjectives, initiatives, adrs, principles, glossaryTerms,
} from '@/db/schema'
import { and, count, eq, inArray, max } from 'drizzle-orm'
import type { ConfidenceSettings } from '@/db/schema'

export type ConfidenceLabel = 'actively maintained' | 'under development' | 'getting started'

export type ConfidenceSummary = {
  label: ConfidenceLabel
  score: number
  lastUpdated: Date | null
  shouldShow: boolean
  narrative: string | null
  settings: ConfidenceSettings
}

const DEFAULT_SETTINGS: ConfidenceSettings = {
  enabled: false,
  narrative: null,
  suppressBelowPercent: 50,
}

function scoreToLabel(score: number): ConfidenceLabel {
  if (score >= 70) return 'actively maintained'
  if (score >= 40) return 'under development'
  return 'getting started'
}

export async function getConfidenceSummary(orgId: string): Promise<ConfidenceSummary> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { confidenceSettings: true },
  })

  const settings: ConfidenceSettings = org?.confidenceSettings ?? DEFAULT_SETTINGS

  if (!settings.enabled) {
    return { label: 'getting started', score: 0, lastUpdated: null, shouldShow: false, narrative: null, settings }
  }

  const [
    totalCaps, pubCaps,
    totalApps, pubApps,
    totalPersonas, pubPersonas,
    totalVS, pubVS,
    totalObj, pubObj,
    totalPrinciples, pubPrinciples,
    totalGlossary, pubGlossary,
    totalInit, activeInit,
    totalAdrs, acceptedAdrs,
    latestCap, latestApp, latestPersona, latestVS, latestInit,
  ] = await Promise.all([
    db.select({ count: count() }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
    db.select({ count: count() }).from(capabilities).where(and(eq(capabilities.organizationId, orgId), eq(capabilities.status, 'published'))),
    db.select({ count: count() }).from(applications).where(eq(applications.organizationId, orgId)),
    db.select({ count: count() }).from(applications).where(and(eq(applications.organizationId, orgId), eq(applications.status, 'published'))),
    db.select({ count: count() }).from(personas).where(eq(personas.organizationId, orgId)),
    db.select({ count: count() }).from(personas).where(and(eq(personas.organizationId, orgId), eq(personas.status, 'published'))),
    db.select({ count: count() }).from(valueStreams).where(eq(valueStreams.organizationId, orgId)),
    db.select({ count: count() }).from(valueStreams).where(and(eq(valueStreams.organizationId, orgId), eq(valueStreams.status, 'published'))),
    db.select({ count: count() }).from(strategicObjectives).where(eq(strategicObjectives.organizationId, orgId)),
    db.select({ count: count() }).from(strategicObjectives).where(and(eq(strategicObjectives.organizationId, orgId), eq(strategicObjectives.status, 'published'))),
    db.select({ count: count() }).from(principles).where(eq(principles.organizationId, orgId)),
    db.select({ count: count() }).from(principles).where(and(eq(principles.organizationId, orgId), eq(principles.status, 'published'))),
    db.select({ count: count() }).from(glossaryTerms).where(eq(glossaryTerms.organizationId, orgId)),
    db.select({ count: count() }).from(glossaryTerms).where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.status, 'published'))),
    db.select({ count: count() }).from(initiatives).where(eq(initiatives.organizationId, orgId)),
    db.select({ count: count() }).from(initiatives).where(and(eq(initiatives.organizationId, orgId), inArray(initiatives.status, ['active', 'complete']))),
    db.select({ count: count() }).from(adrs).where(eq(adrs.organizationId, orgId)),
    db.select({ count: count() }).from(adrs).where(and(eq(adrs.organizationId, orgId), eq(adrs.status, 'accepted'))),
    db.select({ latest: max(capabilities.updatedAt) }).from(capabilities).where(eq(capabilities.organizationId, orgId)),
    db.select({ latest: max(applications.updatedAt) }).from(applications).where(eq(applications.organizationId, orgId)),
    db.select({ latest: max(personas.updatedAt) }).from(personas).where(eq(personas.organizationId, orgId)),
    db.select({ latest: max(valueStreams.updatedAt) }).from(valueStreams).where(eq(valueStreams.organizationId, orgId)),
    db.select({ latest: max(initiatives.updatedAt) }).from(initiatives).where(eq(initiatives.organizationId, orgId)),
  ])

  const totalAll =
    Number(totalCaps[0].count) + Number(totalApps[0].count) + Number(totalPersonas[0].count) +
    Number(totalVS[0].count) + Number(totalObj[0].count) + Number(totalInit[0].count) +
    Number(totalAdrs[0].count) + Number(totalPrinciples[0].count) + Number(totalGlossary[0].count)

  const totalMature =
    Number(pubCaps[0].count) + Number(pubApps[0].count) + Number(pubPersonas[0].count) +
    Number(pubVS[0].count) + Number(pubObj[0].count) + Number(activeInit[0].count) +
    Number(acceptedAdrs[0].count) + Number(pubPrinciples[0].count) + Number(pubGlossary[0].count)

  const score = totalAll === 0 ? 0 : Math.round((totalMature / totalAll) * 100)

  const dates = [
    latestCap[0].latest, latestApp[0].latest, latestPersona[0].latest,
    latestVS[0].latest, latestInit[0].latest,
  ].filter((d): d is Date => d != null)

  const lastUpdated = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

  const shouldShow = score >= settings.suppressBelowPercent

  return {
    label: scoreToLabel(score),
    score,
    lastUpdated,
    shouldShow,
    narrative: settings.narrative ?? null,
    settings,
  }
}

export function formatConfidenceDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
