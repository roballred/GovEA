import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTheme, themeToStyleString } from '@/lib/themes'
import type { Role } from '@/lib/rbac'
import { AppShell } from '@/components/app-shell'

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as Role

  // Load org theme
  let themeStyle = ''
  if ((session.user as any).organizationId) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, (session.user as any).organizationId),
    })
    if (org) {
      const theme = getTheme(org.theme)
      themeStyle = themeToStyleString(theme)
    }
  }

  // Sign-out is a server action — defined here, passed as a slot to the client shell
  const signOutSlot = (
    <form action={async () => {
      'use server'
      await signOut({ redirectTo: '/login' })
    }}>
      <Button
        variant="ghost"
        size="sm"
        type="submit"
        className="hover:bg-white/10 text-white"
      >
        Sign out
      </Button>
    </form>
  )

  return (
    <AppShell
      role={role}
      email={session.user.email ?? ''}
      roleBadgeClass={ROLE_BADGE_CLASS[role]}
      themeStyle={themeStyle}
      isDev={process.env.NODE_ENV === 'development'}
      signOutSlot={signOutSlot}
    >
      {children}
    </AppShell>
  )
}
