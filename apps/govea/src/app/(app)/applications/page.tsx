import { db } from '@/lib/db'
import Link from 'next/link'

export const metadata = { title: 'Applications' }

const LIFECYCLE_BADGE: Record<string, string> = {
  current:        'bg-green-100 text-green-800',
  aging:          'bg-yellow-100 text-yellow-800',
  sunset:         'bg-orange-100 text-orange-800',
  decommissioned: 'bg-gray-100 text-gray-600',
  planned:        'bg-blue-100 text-blue-800',
}

const CRITICALITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high:     'bg-orange-100 text-orange-800',
  medium:   'bg-yellow-100 text-yellow-800',
  low:      'bg-gray-100 text-gray-600',
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; search?: string }>
}) {
  const { filter, search } = await searchParams

  const org = await db.organization.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!org) return null

  const applications = await db.application.findMany({
    where: {
      organizationId: org.id,
      status: 'published',
      ...(filter ? { lifecycleStatus: filter } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      capabilities: { include: { capability: { select: { name: true } } } },
      personas:     { include: { persona:     { select: { name: true } } } },
    },
    orderBy: [{ lifecycleStatus: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            {applications.length} application{applications.length !== 1 ? 's' : ''} in portfolio
          </p>
        </div>
        <Link href="/applications/new" className="btn-primary">
          Add Application
        </Link>
      </div>

      {/* Lifecycle filter tabs */}
      <div className="flex gap-1 border-b">
        {[
          { label: 'All',           value: undefined },
          { label: 'Current',       value: 'current' },
          { label: 'Aging',         value: 'aging' },
          { label: 'Sunset',        value: 'sunset' },
          { label: 'Planned',       value: 'planned' },
          { label: 'Decommissioned',value: 'decommissioned' },
        ].map(tab => (
          <Link
            key={tab.label}
            href={tab.value ? `/applications?filter=${tab.value}` : '/applications'}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.value || (!filter && !tab.value)
                ? 'border-govea-600 text-govea-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Application list */}
      {applications.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <p className="text-4xl mb-3">⊞</p>
          <p className="text-gray-500">No applications found. Add your first application to start building the portfolio.</p>
          <Link href="/applications/new" className="btn-primary mt-4">Add Application</Link>
        </div>
      ) : (
        <div className="card divide-y">
          {applications.map(app => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{app.name}</span>
                  {app.vendor && (
                    <span className="text-xs text-gray-400">{app.vendor}</span>
                  )}
                  <span className={`badge ${LIFECYCLE_BADGE[app.lifecycleStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {app.lifecycleStatus}
                  </span>
                  {app.businessCriticality && (
                    <span className={`badge ${CRITICALITY_BADGE[app.businessCriticality] ?? ''}`}>
                      {app.businessCriticality}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {app.capabilities.slice(0, 3).map(ac => (
                    <span key={ac.capabilityId} className="badge bg-purple-50 text-purple-700">
                      {ac.capability.name}
                    </span>
                  ))}
                  {app.capabilities.length > 3 && (
                    <span className="badge bg-gray-100 text-gray-500">
                      +{app.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              {app.annualCost && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Annual cost</p>
                  <p className="text-sm font-medium">${app.annualCost.toLocaleString()}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
