import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ApplicationImpact, CapabilityImpact, ImpactInitiative, RiskLevel } from '@/actions/impact'

const RISK_BORDER: Record<RiskLevel, string> = {
  high: 'border-red-300 bg-red-950/20',
  medium: 'border-amber-300 bg-amber-950/20',
  none: 'border-slate-200 bg-muted/20',
}

const RISK_BADGE: Record<RiskLevel, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  high: 'High Risk',
  medium: 'Medium Risk',
  none: 'No Impact',
}

const IMPACT_BADGE: Record<string, string> = {
  build: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  improve: 'bg-blue-100 text-blue-800 border-blue-200',
  retire: 'bg-red-100 text-red-800 border-red-200',
  migrate: 'bg-violet-100 text-violet-800 border-violet-200',
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{children}</p>
}

function ImpactBadge({ impact }: { impact: string | null }) {
  if (!impact) return null
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', IMPACT_BADGE[impact] ?? 'bg-slate-100 text-slate-700 border-slate-200')}>
      {impact}
    </span>
  )
}

function InitiativeList({ initiatives }: { initiatives: ImpactInitiative[] }) {
  if (initiatives.length === 0) return null
  return (
    <div className="space-y-1.5">
      <SectionHeading>Referenced in Initiatives ({initiatives.length})</SectionHeading>
      <ul className="space-y-1">
        {initiatives.map(i => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <Link href={`/initiatives/${i.id}`} className="hover:underline truncate">{i.name}</Link>
            <ImpactBadge impact={i.impact} />
            <span className="text-xs text-muted-foreground shrink-0">{i.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ApplicationImpactPanel({ impact }: { impact: ApplicationImpact }) {
  const { orphanedCapabilities, affectedPersonas, activeInitiatives, riskLevel } = impact
  const hasContent = orphanedCapabilities.length > 0 || affectedPersonas.length > 0 || activeInitiatives.length > 0

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', RISK_BORDER[riskLevel])}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Decommission Impact</h2>
        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shrink-0', RISK_BADGE[riskLevel])}>
          {RISK_LABEL[riskLevel]}
        </span>
      </div>

      {!hasContent && (
        <p className="text-sm text-muted-foreground">
          No downstream dependencies detected. Decommissioning this application would not orphan any capabilities or affect any personas.
        </p>
      )}

      {orphanedCapabilities.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>Orphaned Capabilities ({orphanedCapabilities.length})</SectionHeading>
          <p className="text-xs text-muted-foreground">These capabilities would have no remaining application support:</p>
          <ul className="space-y-1">
            {orphanedCapabilities.map(cap => (
              <li key={cap.id} className="flex items-center justify-between text-sm gap-3">
                <Link href={`/capabilities/${cap.id}`} className="hover:underline truncate">{cap.name}</Link>
                {cap.personaCount > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {cap.personaCount} {cap.personaCount === 1 ? 'persona' : 'personas'} affected
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {affectedPersonas.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>Affected Personas ({affectedPersonas.length})</SectionHeading>
          <ul className="space-y-1">
            {affectedPersonas.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <Link href={`/personas/${p.id}`} className="hover:underline">{p.name}</Link>
                {p.type && <span className="text-xs text-muted-foreground">{p.type}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <InitiativeList initiatives={activeInitiatives} />
    </div>
  )
}

export function CapabilityImpactPanel({ impact }: { impact: CapabilityImpact }) {
  const { dependentPersonas, soleCoveragePersonaIds, activeInitiatives, riskLevel } = impact
  const hasContent = dependentPersonas.length > 0 || activeInitiatives.length > 0
  const soleCoveragePersonas = dependentPersonas.filter(p => soleCoveragePersonaIds.includes(p.id))
  const otherPersonas = dependentPersonas.filter(p => !soleCoveragePersonaIds.includes(p.id))

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', RISK_BORDER[riskLevel])}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Change Impact</h2>
        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shrink-0', RISK_BADGE[riskLevel])}>
          {RISK_LABEL[riskLevel]}
        </span>
      </div>

      {!hasContent && (
        <p className="text-sm text-muted-foreground">
          No downstream dependencies detected. Retiring this capability would not leave any persona without coverage.
        </p>
      )}

      {soleCoveragePersonas.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>No Fallback — {soleCoveragePersonas.length} {soleCoveragePersonas.length === 1 ? 'Persona' : 'Personas'}</SectionHeading>
          <p className="text-xs text-muted-foreground">These personas have no other capability to fall back on:</p>
          <ul className="space-y-1">
            {soleCoveragePersonas.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <Link href={`/personas/${p.id}`} className="hover:underline">{p.name}</Link>
                {p.type && <span className="text-xs text-muted-foreground">{p.type}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherPersonas.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>
            {soleCoveragePersonas.length > 0 ? `Other Dependent Personas (${otherPersonas.length})` : `Dependent Personas (${dependentPersonas.length})`}
          </SectionHeading>
          <ul className="space-y-1">
            {otherPersonas.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <Link href={`/personas/${p.id}`} className="hover:underline">{p.name}</Link>
                {p.type && <span className="text-xs text-muted-foreground">{p.type}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <InitiativeList initiatives={activeInitiatives} />
    </div>
  )
}
