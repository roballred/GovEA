import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { isInstanceAdmin } from '@/lib/rbac'
import { InstanceShell } from '@/components/instance-shell'
import { db } from '@/db/client'
import { breakGlassSessions, organizations } from '@/db/schema'
import { and, eq, isNull, gt } from 'drizzle-orm'

export default async function InstanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isInstanceAdmin(session.user)) redirect('/')

  const now = new Date()
  const activeSessions = await db
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
      )
    )

  const signOutSlot = (
    <form action={async () => {
      'use server'
      await signOut({ redirectTo: '/login' })
    }}>
      <Button variant="ghost" size="sm" type="submit" className="hover:bg-white/10 text-white">
        Sign out
      </Button>
    </form>
  )

  return (
    <InstanceShell
      email={session.user.email ?? ''}
      signOutSlot={signOutSlot}
      activeBreakGlassSessions={activeSessions}
    >
      {children}
    </InstanceShell>
  )
}
