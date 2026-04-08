'use server'

import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { themes } from '@/lib/themes'
import { redirect } from 'next/navigation'

export async function updateOrgTheme(themeId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')

  const orgId = session.user.organizationId!

  // Validate theme ID
  const valid = themes.find(t => t.id === themeId)
  if (!valid) throw new Error('Invalid theme')

  const before = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  })

  await db.update(organizations)
    .set({ theme: themeId, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))

  await writeAuditLog({
    action: 'settings.theme_changed',
    entityType: 'organization',
    entityId: orgId,
    userId: session.user.id,
    organizationId: orgId,
    before: { theme: before?.theme },
    after: { theme: themeId },
  })
}
