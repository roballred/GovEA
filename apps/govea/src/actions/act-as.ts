'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { applications, organizations } from '@/db/schema'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { writeAuditLog } from '@/lib/audit'
import {
  ACT_AS_COOKIE,
  endActAsSession as endSession,
  getActiveActAsSession,
  requireActAs,
  startActAsSession,
} from '@/lib/act-as'

export async function startActAs(targetOrgId: string): Promise<void> {
  const session = await requireInstanceAdmin()
  const adminOrgId = session.user.organizationId
  if (!adminOrgId) throw new Error('Instance admin has no home org')

  const row = await startActAsSession(
    { instanceAdminId: session.user.id, targetOrgId },
    adminOrgId,
  )
  if (!row) {
    throw new Error('Cannot start act-as session — no active break-glass for this org')
  }

  const target = await db.query.organizations.findFirst({ where: eq(organizations.id, targetOrgId) })

  await writeAuditLog(db, {
    action: 'instance.act_as.start',
    entityType: 'act_as_session',
    entityId: row.id,
    userId: session.user.id,
    organizationId: targetOrgId,
    metadata: {
      impersonatedOrgId: targetOrgId,
      impersonatedOrgName: target?.name,
      breakGlassSessionId: row.breakGlassSessionId,
      expiresAt: row.expiresAt.toISOString(),
    },
  })

  ;(await cookies()).set(ACT_AS_COOKIE, row.id, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    expires: row.expiresAt,
    path: '/',
  })
}

export async function endActAs(): Promise<void> {
  await requireInstanceAdmin()
  const current = await getActiveActAsSession()
  if (current) {
    await endSession(current.id, 'admin_ended')
    await writeAuditLog(db, {
      action: 'instance.act_as.end',
      entityType: 'act_as_session',
      entityId: current.id,
      userId: current.instanceAdminId,
      organizationId: current.targetOrgId,
      metadata: {
        impersonatedOrgId: current.targetOrgId,
        impersonationSessionId: current.id,
        breakGlassSessionId: current.breakGlassSessionId,
        endReason: 'admin_ended',
      },
    })
  }
  ;(await cookies()).delete(ACT_AS_COOKIE)
  revalidatePath('/', 'layout')
}

/**
 * Cross-tenant admin tool: force an application back to `published` status.
 *
 * Wired through `requireActAs` — refuses without an active, non-expired
 * act-as session whose target org matches the application's org. Audit
 * preserves the real instance admin as `userId` and records the tenant
 * context via `metadata.impersonatedOrgId` + `impersonationSessionId`.
 */
export async function forceRepublishApplication(applicationId: string): Promise<void> {
  const session = await requireInstanceAdmin()

  const before = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
  })
  if (!before) throw new Error('Application not found')

  const actAs = await requireActAs(before.organizationId)

  await db.transaction(async (tx) => {
    await tx.update(applications)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(applications.id, applicationId))

    await writeAuditLog(tx, {
      action: 'instance.act_as.application.force_republish',
      entityType: 'application',
      entityId: applicationId,
      userId: session.user.id,
      organizationId: before.organizationId,
      before: { status: before.status },
      after: { status: 'published' },
      metadata: {
        impersonatedOrgId: before.organizationId,
        impersonationSessionId: actAs.id,
        breakGlassSessionId: actAs.breakGlassSessionId,
      },
    })
  })

  revalidatePath(`/applications/${applicationId}`)
}

export async function startActAsFromOrgPage(formData: FormData): Promise<void> {
  const targetOrgId = formData.get('orgId') as string
  await startActAs(targetOrgId)
  redirect(`/instance/orgs/${targetOrgId}`)
}
