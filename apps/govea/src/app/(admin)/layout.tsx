import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTheme, themeToStyleString } from '@/lib/themes'
import type { Role } from '@/lib/rbac'
import { DevToolbar } from '@/components/dev-toolbar'

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

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/personas', label: 'Personas', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/capabilities', label: 'Capabilities', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/applications', label: 'Applications', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/adrs', label: 'ADRs', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/taxonomy', label: 'Taxonomy', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/users', label: 'Users', roles: ['admin'] as Role[] },
    { href: '/connections', label: 'Connections', roles: ['admin'] as Role[] },
    { href: '/audit', label: 'Audit Log', roles: ['admin'] as Role[] },
    { href: '/settings', label: 'Settings', roles: ['admin'] as Role[] },
  ]

  const roleBadgeClass: Record<Role, string> = {
    admin: 'bg-violet-100 text-violet-800 border-violet-200',
    contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    viewer: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <div className="min-h-screen bg-background">
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
      <header
        className="border-b"
        style={{
          backgroundColor: 'hsl(var(--header-bg))',
          borderColor: 'hsl(var(--header-border))',
          color: 'hsl(var(--header-fg))',
        }}
      >
        <div className="flex h-14 items-center gap-6 px-6">
          <span className="font-bold tracking-tight" style={{ color: 'hsl(var(--header-fg))' }}>GovEA</span>
          <nav className="flex items-center gap-1">
            {navLinks
              .filter(l => l.roles.includes(role))
              .map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
                  style={{ color: 'hsl(var(--header-fg) / 0.8)' }}
                >
                  {l.label}
                </a>
              ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm" style={{ color: 'hsl(var(--header-fg) / 0.7)' }}>
              {session.user.email}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', roleBadgeClass[role])}>
              {role}
            </span>
            <form action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="hover:bg-white/10"
                style={{ color: 'hsl(var(--header-fg))' }}
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className={cn('p-6', process.env.NODE_ENV === 'development' && 'pb-16')}>{children}</main>
      {process.env.NODE_ENV === 'development' && <DevToolbar />}
    </div>
  )
}
