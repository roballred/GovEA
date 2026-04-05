import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">GovEA</span>
          <div className="flex gap-4 text-sm">
            {navLinks
              .filter(l => l.roles.includes(role))
              .map(l => (
                <a key={l.href} href={l.href} className="text-gray-600 hover:text-gray-900">{l.label}</a>
              ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{session.user.email}</span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            role === 'admin' ? 'bg-purple-100 text-purple-800' :
            role === 'contributor' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-600'
          }`}>{role}</span>
          <form action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}>
            <button type="submit" className="text-gray-500 hover:text-gray-900">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
