import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/rbac'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as Role

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/personas', label: 'Personas', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/capabilities', label: 'Capabilities', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/applications', label: 'Applications', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/adrs', label: 'ADRs', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/taxonomy', label: 'Taxonomy', roles: ['admin', 'contributor', 'viewer'] as Role[] },
    { href: '/users', label: 'Users', roles: ['admin'] as Role[] },
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
      <header className="border-b bg-white">
        <div className="flex h-14 items-center gap-6 px-6">
          <span className="font-bold text-foreground tracking-tight">GovEA</span>
          <nav className="flex items-center gap-1">
            {navLinks
              .filter(l => l.roles.includes(role))
              .map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', roleBadgeClass[role])}>
              {role}
            </span>
            <form action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
