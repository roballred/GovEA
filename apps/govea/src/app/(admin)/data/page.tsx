import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getDataEntities, getDataAttributes, getDataLinks, getDataBusinessKeys,
} from '@/actions/data-architecture'
import Link from 'next/link'

export default async function DataArchitectureHub() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [entities, attributes, links, businessKeys] = await Promise.all([
    getDataEntities(), getDataAttributes(), getDataLinks(), getDataBusinessKeys(),
  ])

  const cards = [
    {
      href: '/data/entities',
      label: 'Entities',
      count: entities.length,
      blurb: 'Subject things in the model — Hubs in Data Vault terms.',
    },
    {
      href: '/data/attributes',
      label: 'Attributes',
      count: attributes.length,
      blurb: 'Characterizing facts — Satellites in Data Vault terms.',
    },
    {
      href: '/data/links',
      label: 'Links',
      count: links.length,
      blurb: 'Relationships between entities — Data Vault Links.',
    },
    {
      href: '/data/business-keys',
      label: 'Business keys',
      count: businessKeys.length,
      blurb: 'Natural identifiers that instantiate entities.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data architecture</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            A Data Vault-aligned metamodel for Data Architects. Capture entities, attributes, links,
            and business keys with their physical-table metadata.
          </p>
        </div>
        <Link
          href="/data/diagram"
          className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
        >
          View diagram
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map(c => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium">{c.label}</h2>
                <span className="text-sm text-muted-foreground">{c.count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
