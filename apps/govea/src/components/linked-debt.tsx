import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getLinkedDebt, type DebtLinkedEntityType } from '@/lib/linked-debt'
import type { DebtSeverity } from '@/db/schema'
import { cn } from '@/lib/utils'

interface LinkedDebtProps {
  entityType: DebtLinkedEntityType
  entityId: string
  /** Caller's org — used for federation filtering. */
  callerOrgId: string
  role: 'admin' | 'contributor' | 'viewer'
  /** When the caller can edit, render the quick-create CTA. */
  canEdit?: boolean
}

const SEVERITY_BADGE: Record<DebtSeverity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200',
  high:     'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200',
  medium:   'bg-yellow-50 text-yellow-800 border-yellow-200',
  low:      'bg-muted text-muted-foreground border-border',
}

const SEVERITY_ORDER: DebtSeverity[] = ['critical', 'high', 'medium', 'low']

const QUERY_PARAM_BY_TYPE: Record<DebtLinkedEntityType, string> = {
  application: 'applicationId',
  capability:  'capabilityId',
  adr:         'adrId',
  initiative:  'initiativeId',
}

export async function LinkedDebt({ entityType, entityId, callerOrgId, role, canEdit = false }: LinkedDebtProps) {
  const summary = await getLinkedDebt(entityType, entityId, callerOrgId, role)

  const newDebtHref = `/debt/new?${QUERY_PARAM_BY_TYPE[entityType]}=${encodeURIComponent(entityId)}`

  // Zero state — viewers don't see the CTA so just hide the card entirely.
  if (summary.total === 0) {
    if (!canEdit) return null
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Architecture debt</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">No debt tracked against this object.</p>
          <Link href={newDebtHref} className="text-sm text-primary hover:underline mt-1 inline-block">
            + Record a debt item
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
          <span>Architecture debt ({summary.total})</span>
          {canEdit && (
            <Link href={newDebtHref} className="text-xs font-normal text-primary hover:underline">
              + Add
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Severity breakdown — only render severities present */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {SEVERITY_ORDER.map(sev => {
            const n = summary.bySeverity[sev]
            if (!n) return null
            return (
              <span
                key={sev}
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 capitalize font-medium',
                  SEVERITY_BADGE[sev],
                )}
              >
                {n} {sev}
              </span>
            )
          })}
          <span className="text-muted-foreground">
            {summary.openCount} open
          </span>
        </div>

        {/* Top items list */}
        <ul className="space-y-1.5">
          {summary.items.map(item => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] capitalize',
                SEVERITY_BADGE[item.severity],
              )}>
                {item.severity}
              </span>
              <Link href={`/debt/${item.id}`} className="hover:underline truncate">{item.title}</Link>
              {item.securitySensitive && (
                <span className="text-xs text-amber-700 dark:text-amber-300" title="Security-sensitive">🔒</span>
              )}
            </li>
          ))}
        </ul>

        {summary.total > summary.items.length && (
          <p className="text-xs text-muted-foreground">
            Showing {summary.items.length} of {summary.total}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
