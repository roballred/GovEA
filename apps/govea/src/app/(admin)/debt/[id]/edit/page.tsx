import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DebtForm } from '@/components/debt-form'
import { editDebtItem, getDebtItem } from '@/actions/architecture-debt'
import { getApplications } from '@/actions/applications'
import { getCapabilities } from '@/actions/capabilities'
import { getADRs } from '@/actions/adrs'
import { getInitiatives } from '@/actions/initiatives'
import Link from 'next/link'

export default async function EditDebtPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/debt')
  const orgId = session.user.organizationId!

  const { id } = await params
  const item = await getDebtItem(id)
  if (!item) notFound()
  if (item.organizationId !== orgId) redirect('/debt')

  const [apps, caps, adrs, inits] = await Promise.all([
    getApplications(),
    getCapabilities(),
    getADRs(),
    getInitiatives(),
  ])

  // Bind the action to the id so the form can submit a single arg.
  const editBound = editDebtItem.bind(null, id)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/debt/${id}`} className="text-sm text-muted-foreground hover:underline">← Back to detail</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit debt item</h1>
      </div>
      <DebtForm
        initial={item}
        applications={apps.map(a => ({ id: a.id, name: a.name }))}
        capabilities={caps.map(c => ({ id: c.id, name: c.name }))}
        adrs={adrs.map(a => ({ id: a.id, name: `${a.number} — ${a.title}` }))}
        initiatives={inits.map(i => ({ id: i.id, name: i.name }))}
        action={editBound}
        successHref={`/debt/${id}`}
      />
    </div>
  )
}
