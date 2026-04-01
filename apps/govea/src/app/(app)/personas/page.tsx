import { db } from '@/lib/db'
import Link from 'next/link'

export const metadata = { title: 'Personas' }

const ROLE_BADGE: Record<string, string> = {
  citizen:  'bg-green-100 text-green-800',
  staff:    'bg-blue-100 text-blue-800',
  elected:  'bg-purple-100 text-purple-800',
  external: 'bg-orange-100 text-orange-800',
}

const ROLE_LABEL: Record<string, string> = {
  citizen:  'Citizen / Public',
  staff:    'Staff / Employee',
  elected:  'Elected Official',
  external: 'External Partner',
}

export default async function PersonasPage() {
  const org = await db.organization.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!org) return null

  const personas = await db.persona.findMany({
    where: { organizationId: org.id, status: 'published' },
    include: {
      _count: { select: { capabilities: true, applications: true } },
    },
    orderBy: [{ roleType: 'asc' }, { name: 'asc' }],
  })

  // Group by role type
  const grouped = personas.reduce<Record<string, typeof personas>>(
    (acc, p) => {
      if (!acc[p.roleType]) acc[p.roleType] = []
      acc[p.roleType].push(p)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Personas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real people affected by your organization's technology. Every capability must trace to a persona.
          </p>
        </div>
        <Link href="/personas/new" className="btn-primary">
          Add Persona
        </Link>
      </div>

      {personas.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <p className="text-4xl mb-3">◎</p>
          <p className="text-gray-500">No personas yet. Start by defining who your technology serves.</p>
          <Link href="/personas/new" className="btn-primary mt-4">Add Persona</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([roleType, group]) => (
            <div key={roleType}>
              <h3 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
                {ROLE_LABEL[roleType] ?? roleType}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map(persona => (
                  <Link
                    key={persona.id}
                    href={`/personas/${persona.id}`}
                    className="card p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{persona.name}</p>
                        {persona.department && (
                          <p className="text-xs text-gray-400 mt-0.5">{persona.department}</p>
                        )}
                      </div>
                      <span className={`badge shrink-0 ${ROLE_BADGE[persona.roleType] ?? 'bg-gray-100'}`}>
                        {ROLE_LABEL[persona.roleType] ?? persona.roleType}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-3 text-xs text-gray-500 border-t pt-3">
                      <span>⚡ {persona._count.capabilities} capabilities</span>
                      <span>⊞ {persona._count.applications} apps</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
