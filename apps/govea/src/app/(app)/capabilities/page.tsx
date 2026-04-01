import { db } from '@/lib/db'
import Link from 'next/link'

export const metadata = { title: 'Capabilities' }

type CapabilityWithChildren = {
  id: string
  name: string
  domain: string | null
  strategicImportance: string | null
  maturityLevel: string | null
  parentId: string | null
  _count: { personas: number; applications: number }
  children: CapabilityWithChildren[]
}

const IMPORTANCE_BADGE: Record<string, string> = {
  core:       'bg-govea-100 text-govea-800',
  supporting: 'bg-blue-100 text-blue-800',
  enabling:   'bg-gray-100 text-gray-700',
}

function CapabilityNode({
  cap,
  depth = 0,
}: {
  cap: CapabilityWithChildren
  depth?: number
}) {
  return (
    <div>
      <Link
        href={`/capabilities/${cap.id}`}
        className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors rounded-md ${
          depth > 0 ? 'ml-6 border-l border-gray-200 pl-4' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{cap.name}</span>
            {cap.strategicImportance && (
              <span className={`badge ${IMPORTANCE_BADGE[cap.strategicImportance] ?? 'bg-gray-100'}`}>
                {cap.strategicImportance}
              </span>
            )}
          </div>
          {cap.domain && (
            <p className="text-xs text-gray-400 mt-0.5">{cap.domain}</p>
          )}
          <div className="mt-1 flex gap-3 text-xs text-gray-500">
            <span>◎ {cap._count.personas} persona{cap._count.personas !== 1 ? 's' : ''}</span>
            <span>⊞ {cap._count.applications} app{cap._count.applications !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </Link>
      {cap.children.map(child => (
        <CapabilityNode key={child.id} cap={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default async function CapabilitiesPage() {
  const org = await db.organization.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!org) return null

  const allCaps = await db.capability.findMany({
    where: { organizationId: org.id, status: 'published' },
    include: { _count: { select: { personas: true, applications: true } } },
    orderBy: { name: 'asc' },
  })

  // Build hierarchy tree
  const map = new Map<string, CapabilityWithChildren>()
  for (const cap of allCaps) {
    map.set(cap.id, { ...cap, children: [] })
  }
  const roots: CapabilityWithChildren[] = []
  for (const cap of map.values()) {
    if (cap.parentId && map.has(cap.parentId)) {
      map.get(cap.parentId)!.children.push(cap)
    } else {
      roots.push(cap)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Capabilities</h1>
          <p className="mt-1 text-sm text-gray-500">
            What your organization does — every capability traces to a persona.
          </p>
        </div>
        <Link href="/capabilities/new" className="btn-primary">
          Add Capability
        </Link>
      </div>

      {roots.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-gray-500">No capabilities yet. Add your first capability to start building the capability map.</p>
          <Link href="/capabilities/new" className="btn-primary mt-4">Add Capability</Link>
        </div>
      ) : (
        <div className="card divide-y p-2">
          {roots.map(cap => (
            <CapabilityNode key={cap.id} cap={cap} />
          ))}
        </div>
      )}
    </div>
  )
}
