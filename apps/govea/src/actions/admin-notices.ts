'use server'

import { and, eq, ne } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { db } from '@/db/client'
import {
  adminNotices,
  isNoticeSeverity,
  type NoticeSeverity,
} from '@/db/schema'
import { writeAuditLog } from '@/lib/audit'
import { validateLearnMoreUrl } from '@/lib/admin-notices'

async function requireOrgAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  if (!session.user.organizationId) throw new Error('Org admin has no org')
  return { session, orgId: session.user.organizationId as string }
}

interface NoticeInput {
  title: string
  body: string
  severity: NoticeSeverity
  learnMoreUrl?: string | null
}

function parseNoticeInput(formData: FormData): NoticeInput {
  const title = (formData.get('title') as string ?? '').trim()
  const body = (formData.get('body') as string ?? '').trim()
  const severity = formData.get('severity') as string
  const learnMoreUrlRaw = formData.get('learnMoreUrl') as string | null

  if (title.length === 0) throw new Error('Title is required')
  if (title.length > 200) throw new Error('Title must be 200 characters or fewer')
  if (body.length === 0) throw new Error('Body is required')
  if (body.length > 2000) throw new Error('Body must be 2000 characters or fewer')
  if (!isNoticeSeverity(severity)) throw new Error('Invalid severity')

  return {
    title,
    body,
    severity,
    learnMoreUrl: validateLearnMoreUrl(learnMoreUrlRaw),
  }
}

export async function createOrgNotice(formData: FormData): Promise<void> {
  const { session, orgId } = await requireOrgAdmin()
  const input = parseNoticeInput(formData)
  const activateNow = formData.get('activate') === 'true'

  await db.transaction(async (tx) => {
    if (activateNow) {
      await tx.update(adminNotices)
        .set({ active: false, updatedAt: new Date() })
        .where(and(
          eq(adminNotices.scope, 'org'),
          eq(adminNotices.organizationId, orgId),
          eq(adminNotices.active, true),
        ))
    }

    const [row] = await tx.insert(adminNotices).values({
      scope: 'org',
      organizationId: orgId,
      severity: input.severity,
      title: input.title,
      body: input.body,
      learnMoreUrl: input.learnMoreUrl,
      active: activateNow,
      createdBy: session.user.id,
    }).returning()

    await writeAuditLog(tx, {
      action: 'admin_notice.create',
      entityType: 'admin_notice',
      entityId: row.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { title: input.title, severity: input.severity, active: activateNow },
    })
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings/notices')
}

export async function updateOrgNotice(noticeId: string, formData: FormData): Promise<void> {
  const { session, orgId } = await requireOrgAdmin()
  const input = parseNoticeInput(formData)

  const before = await db.query.adminNotices.findFirst({
    where: eq(adminNotices.id, noticeId),
  })
  if (!before) throw new Error('Notice not found')
  if (before.scope !== 'org' || before.organizationId !== orgId) {
    throw new Error('Forbidden')
  }

  await db.transaction(async (tx) => {
    await tx.update(adminNotices)
      .set({
        title: input.title,
        body: input.body,
        severity: input.severity,
        learnMoreUrl: input.learnMoreUrl,
        updatedAt: new Date(),
      })
      .where(eq(adminNotices.id, noticeId))

    await writeAuditLog(tx, {
      action: 'admin_notice.update',
      entityType: 'admin_notice',
      entityId: noticeId,
      userId: session.user.id,
      organizationId: orgId,
      before: { title: before.title, severity: before.severity },
      after: { title: input.title, severity: input.severity },
    })
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings/notices')
}

export async function setOrgNoticeActive(noticeId: string, active: boolean): Promise<void> {
  const { session, orgId } = await requireOrgAdmin()

  const before = await db.query.adminNotices.findFirst({
    where: eq(adminNotices.id, noticeId),
  })
  if (!before) throw new Error('Notice not found')
  if (before.scope !== 'org' || before.organizationId !== orgId) {
    throw new Error('Forbidden')
  }

  await db.transaction(async (tx) => {
    if (active) {
      await tx.update(adminNotices)
        .set({ active: false, updatedAt: new Date() })
        .where(and(
          eq(adminNotices.scope, 'org'),
          eq(adminNotices.organizationId, orgId),
          eq(adminNotices.active, true),
          ne(adminNotices.id, noticeId),
        ))
    }

    await tx.update(adminNotices)
      .set({ active, updatedAt: new Date() })
      .where(eq(adminNotices.id, noticeId))

    await writeAuditLog(tx, {
      action: active ? 'admin_notice.activate' : 'admin_notice.deactivate',
      entityType: 'admin_notice',
      entityId: noticeId,
      userId: session.user.id,
      organizationId: orgId,
      before: { active: before.active },
      after: { active },
    })
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings/notices')
}

export async function deleteOrgNotice(noticeId: string): Promise<void> {
  const { session, orgId } = await requireOrgAdmin()

  const before = await db.query.adminNotices.findFirst({
    where: eq(adminNotices.id, noticeId),
  })
  if (!before) throw new Error('Notice not found')
  if (before.scope !== 'org' || before.organizationId !== orgId) {
    throw new Error('Forbidden')
  }

  await db.transaction(async (tx) => {
    await tx.delete(adminNotices).where(eq(adminNotices.id, noticeId))
    await writeAuditLog(tx, {
      action: 'admin_notice.delete',
      entityType: 'admin_notice',
      entityId: noticeId,
      userId: session.user.id,
      organizationId: orgId,
      before: { title: before.title, severity: before.severity, active: before.active },
    })
  })

  revalidatePath('/', 'layout')
  revalidatePath('/settings/notices')
}

// FormData adapters for use in inline server-action forms.

export async function createOrgNoticeFromForm(formData: FormData): Promise<void> {
  await createOrgNotice(formData)
}

export async function setOrgNoticeActiveFromForm(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const active = formData.get('active') === 'true'
  await setOrgNoticeActive(id, active)
}

export async function deleteOrgNoticeFromForm(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  await deleteOrgNotice(id)
}
