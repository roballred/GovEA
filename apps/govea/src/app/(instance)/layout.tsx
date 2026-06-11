import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { isInstanceAdmin } from '@/lib/rbac'
import { InstanceShell } from '@/components/instance-shell'
import { AdminNoticeBanner } from '@/components/admin-notice-banner'
import { db } from '@/db/client'
import { breakGlassSessions, organizations, platformConfig } from '@/db/schema'
import { and, eq, isNotNull, isNull, gt, or } from 'drizzle-orm'

export default async function InstanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isInstanceAdmin(session.user)) redirect('/')

  const now = new Date()
  const [activeSessions, config] = await Promise.all([
    db
      .select({
        id: breakGlassSessions.id,
        targetOrgName: organizations.name,
        expiresAt: breakGlassSessions.expiresAt,
      })
      .from(breakGlassSessions)
      .innerJoin(organizations, eq(breakGlassSessions.targetOrgId, organizations.id))
      .where(
        and(
          eq(breakGlassSessions.instanceAdminId, session.user.id),
          isNull(breakGlassSessions.revokedAt),
          gt(breakGlassSessions.expiresAt, now),
          // Pending-approval sessions are not honored; the banner exists to
          // remind the admin that they currently HAVE elevated access.
          or(
            eq(breakGlassSessions.requiresApproval, false),
            isNotNull(breakGlassSessions.approvedAt),
          ),
        )
      ),
    db.query.platformConfig.findFirst(),
  ])

  // Sign-out posts to a deploy-stable route handler (#759).
  const signOutSlot = <SignOutButton />

  return (
    <InstanceShell
      email={session.user.email ?? ''}
      signOutSlot={signOutSlot}
      activeBreakGlassSessions={activeSessions}
      instanceName={config?.instanceName}
    >
      {/* Instance admins see instance-wide notices on every platform page
          (#456 — "admins are operators; they need to see what tenants see"). */}
      <AdminNoticeBanner />
      {children}
    </InstanceShell>
  )
}
