import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canEdit } from '@/lib/rbac'
import { DebtForm } from '@/components/debt-form'
import { createDebtItem } from '@/actions/architecture-debt'
import { getApplications } from '@/actions/applications'
import { getCapabilities } from '@/actions/capabilities'
import { getADRs } from '@/actions/adrs'
import { getInitiatives } from '@/actions/initiatives'
import Link from 'next/link'

interface SearchParams {
  applicationId?: string
  capabilityId?: string
  adrId?: string
  initiativeId?: string
}

export default async function NewDebtPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canEdit(session.user)) redirect('/debt')

  const params = await searchParams
  const [apps, caps, adrs, inits] = await Promise.all([
    getApplications(),
    getCapabilities(),
    getADRs(),
    getInitiatives(),
  ])

  // Pre-link only when the requested entity exists in the caller's accessible
  // pickers. Filtering against the picker output also filters out unauthorized
  // ids (e.g. an org guessing another org's UUID via the URL).
  const prefilledApplicationIds = params.applicationId && apps.some(a => a.id === params.applicationId) ? [params.applicationId] : []
  const prefilledCapabilityIds  = params.capabilityId  && caps.some(c => c.id === params.capabilityId)  ? [params.capabilityId]  : []
  const prefilledAdrIds         = params.adrId         && adrs.some(a => a.id === params.adrId)         ? [params.adrId]         : []
  const prefilledInitiativeIds  = params.initiativeId  && inits.some(i => i.id === params.initiativeId) ? [params.initiativeId]  : []

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/debt" className="text-sm text-muted-foreground hover:underline">← All debt items</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">New debt item</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Document an architectural constraint and link it to the objects it affects.
        </p>
      </div>
      <DebtForm
        applications={apps.map(a => ({ id: a.id, name: a.name }))}
        capabilities={caps.map(c => ({ id: c.id, name: c.name }))}
        adrs={adrs.map(a => ({ id: a.id, name: `${a.number} — ${a.title}` }))}
        initiatives={inits.map(i => ({ id: i.id, name: i.name }))}
        action={createDebtItem}
        successHref="/debt"
        prefillApplicationIds={prefilledApplicationIds}
        prefillCapabilityIds={prefilledCapabilityIds}
        prefillAdrIds={prefilledAdrIds}
        prefillInitiativeIds={prefilledInitiativeIds}
      />
    </div>
  )
}
