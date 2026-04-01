import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',       href: '/dashboard',      icon: '▦' },
    ],
  },
  {
    label: 'EA Repository',
    items: [
      { label: 'Capabilities',    href: '/capabilities',   icon: '⚡' },
      { label: 'Applications',    href: '/applications',   icon: '⊞' },
      { label: 'Personas',        href: '/personas',       icon: '◎' },
      { label: 'Decisions (ADR)', href: '/adrs',           icon: '✓' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Organization',    href: '/organizations',  icon: '⌂' },
    ],
  },
]

// Server component — no client hooks
export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-govea-950 text-govea-100">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-govea-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-govea-600">
          <span className="text-sm font-bold text-white">G</span>
        </div>
        <span className="text-base font-semibold text-white">GovEA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navigation.map((group) => (
          <div key={group.label} className="mb-6 px-3">
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-govea-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm
                               text-govea-300 transition-colors hover:bg-govea-800 hover:text-white"
                  >
                    <span className="text-xs opacity-70">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-govea-800 p-4">
        <p className="text-xs text-govea-500">
          Open source — MIT License
        </p>
      </div>
    </aside>
  )
}
