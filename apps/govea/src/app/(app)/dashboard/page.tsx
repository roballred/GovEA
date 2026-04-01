import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Dashboard' }

async function getPortfolioStats(organizationId: string) {
  const [applications, capabilities, personas, adrs] = await Promise.all([
    db.application.count({ where: { organizationId, status: 'published' } }),
    db.capability.count({ where: { organizationId, status: 'published' } }),
    db.persona.count({ where: { organizationId, status: 'published' } }),
    db.adr.count({ where: { organizationId } }),
  ])

  const lifecycleBreakdown = await db.application.groupBy({
    by: ['lifecycleStatus'],
    where: { organizationId, status: 'published' },
    _count: true,
  })

  const criticalApps = await db.application.count({
    where: {
      organizationId,
      businessCriticality: 'critical',
      lifecycleStatus: { in: ['aging', 'sunset'] },
    },
  })

  return { applications, capabilities, personas, adrs, lifecycleBreakdown, criticalApps }
}

export default async function DashboardPage() {
  const session = await auth()

  // For now, show first org — multi-org context picker comes in next iteration
  const org = await db.organization.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">⌂</div>
        <h1 className="text-2xl font-semibold">Welcome to GovEA</h1>
        <p className="mt-2 max-w-sm text-gray-500">
          Start by creating your organization, then add capabilities and applications.
        </p>
        <a href="/organizations/new" className="btn-primary mt-6">
          Set up your organization
        </a>
      </div>
    )
  }

  const stats = await getPortfolioStats(org.id)

  const lifecycleMap = Object.fromEntries(
    stats.lifecycleBreakdown.map(b => [b.lifecycleStatus, b._count])
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1>{org.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {org.jurisdictionType.charAt(0).toUpperCase() + org.jurisdictionType.slice(1)} ·{' '}
          {org.state} · EA Maturity Level {org.eaMaturityLevel}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Applications',  value: stats.applications, href: '/applications', color: 'bg-blue-50 text-blue-700' },
          { label: 'Capabilities',  value: stats.capabilities, href: '/capabilities',  color: 'bg-purple-50 text-purple-700' },
          { label: 'Personas',      value: stats.personas,     href: '/personas',      color: 'bg-green-50 text-green-700' },
          { label: 'Decisions',     value: stats.adrs,         href: '/adrs',          color: 'bg-orange-50 text-orange-700' },
        ].map(stat => (
          <a key={stat.label} href={stat.href}
             className="card p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </a>
        ))}
      </div>

      {/* Portfolio Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lifecycle breakdown */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-700">Application Portfolio by Lifecycle</h3>
          <div className="space-y-3">
            {[
              { label: 'Current',        key: 'current',        color: 'bg-green-500' },
              { label: 'Aging',          key: 'aging',          color: 'bg-yellow-500' },
              { label: 'Sunset',         key: 'sunset',         color: 'bg-orange-500' },
              { label: 'Decommissioned', key: 'decommissioned', color: 'bg-gray-400' },
              { label: 'Planned',        key: 'planned',        color: 'bg-blue-400' },
            ].map(item => {
              const count = lifecycleMap[item.key] ?? 0
              const pct = stats.applications > 0 ? Math.round((count / stats.applications) * 100) : 0
              return (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-gray-600">{item.label}</span>
                  <div className="flex-1 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-gray-700">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Risk summary */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-700">Risk Indicators</h3>
          <div className="space-y-4">
            {stats.criticalApps > 0 ? (
              <div className="flex items-start gap-3 rounded-md bg-red-50 p-3">
                <span className="text-red-500">⚠</span>
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {stats.criticalApps} critical application{stats.criticalApps !== 1 ? 's' : ''} aging or sunset
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Review these applications for replacement or remediation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md bg-green-50 p-3">
                <span className="text-green-500">✓</span>
                <p className="text-sm text-green-800">No critical lifecycle risks detected.</p>
              </div>
            )}
            <a href="/applications?filter=aging" className="btn-secondary w-full text-xs">
              View portfolio details
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
