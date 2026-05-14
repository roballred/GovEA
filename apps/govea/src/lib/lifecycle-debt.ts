/**
 * Auto-flag lifecycle debt (#381 PR-4).
 *
 * Per `rm-architecture-debt.md`: "Auto-flag applications where the lifecycle
 * status is `end-of-life`." In the applications schema, EOL maps to the
 * `sunset` and `decommissioned` lifecycle status values.
 *
 * Rules from the spec:
 * - Auto-flagged debt appears in a separate "system-detected" queue, distinct
 *   from human-created items.
 * - Only fires against objects the org owns (cross-org auto-flagging disabled).
 * - Severity: decommissioned → critical ("past end-of-life"); sunset → high
 *   ("approaching end-of-life").
 * - Idempotent: re-running when an existing system-detected item exists for the
 *   same application upgrades/downgrades the severity if needed; it does not
 *   create duplicates.
 */
import { db } from '@/db/client'
import { architectureDebtItems, debtApplications } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export const EOL_LIFECYCLE_STATUSES = ['sunset', 'decommissioned'] as const
type EolStatus = (typeof EOL_LIFECYCLE_STATUSES)[number]

function toSeverity(status: EolStatus): 'critical' | 'high' {
  return status === 'decommissioned' ? 'critical' : 'high'
}

function toTitle(applicationName: string, status: EolStatus): string {
  const label = status === 'decommissioned' ? 'past end of support' : 'approaching end of support'
  return `${applicationName} — ${label}`
}

/**
 * Creates or updates a system-detected lifecycle-risk debt item for an
 * application whose lifecycle status is EOL. Safe to call after every
 * application save — it is idempotent.
 *
 * Does nothing when `lifecycleStatus` is not an EOL value.
 */
export async function autoFlagLifecycleDebt(opts: {
  applicationId: string
  applicationName: string
  organizationId: string
  lifecycleStatus: string
}): Promise<void> {
  const { applicationId, applicationName, organizationId, lifecycleStatus } = opts

  if (!(EOL_LIFECYCLE_STATUSES as readonly string[]).includes(lifecycleStatus)) return

  const eolStatus = lifecycleStatus as EolStatus
  const severity = toSeverity(eolStatus)

  // Look for an existing system-detected lifecycle-risk item linked to this application.
  const [existing] = await db
    .select({ id: architectureDebtItems.id, severity: architectureDebtItems.severity })
    .from(architectureDebtItems)
    .innerJoin(debtApplications, eq(debtApplications.debtItemId, architectureDebtItems.id))
    .where(and(
      eq(debtApplications.applicationId, applicationId),
      eq(architectureDebtItems.source, 'system-detected'),
      eq(architectureDebtItems.debtType, 'lifecycle-risk'),
    ))
    .limit(1)

  if (existing) {
    if (existing.severity !== severity) {
      await db
        .update(architectureDebtItems)
        .set({ severity, updatedAt: new Date() })
        .where(eq(architectureDebtItems.id, existing.id))
    }
    return
  }

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(architectureDebtItems)
      .values({
        organizationId,
        title: toTitle(applicationName, eolStatus),
        description:
          `Automatically generated: the application lifecycle status is "${eolStatus}". ` +
          `Review whether a remediation initiative or acceptance rationale is needed.`,
        debtType: 'lifecycle-risk',
        severity,
        status: 'published',
        securitySensitive: false,
        visibility: 'org',
        source: 'system-detected',
        createdBy: null,
        updatedBy: null,
      })
      .returning({ id: architectureDebtItems.id })

    await tx.insert(debtApplications).values({ debtItemId: row.id, applicationId })
  })
}
