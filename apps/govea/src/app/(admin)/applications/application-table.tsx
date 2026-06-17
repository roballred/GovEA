'use client'

import { useState, useTransition } from 'react'
import type { Application, Capability, EntityTaxonomyValue } from '@/db/schema'
import { createApplication, editApplication, deleteApplication, importApplications, type ImportResult } from '@/actions/applications'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { submitWithDuplicateAck } from '@/lib/duplicate-name-client'
import { useDirtyTracker, confirmDiscard } from '@/lib/use-dirty-dialog'
import { EmptyStateCTA } from '@/components/empty-state-cta'
import { DomainBadge } from '@/components/domain-badge'
import type { Role } from '@/lib/rbac'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyInputs, TaxonomyFilters, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { CustomFieldInputs } from '@/components/custom-field-inputs'
import { DomainOwnerFormSection } from '@/components/domain-owner-form-section'
import type { CustomFieldDefinition } from '@/db/schema'

type ApplicationRow = Pick<Application, 'id' | 'name' | 'description' | 'vendor' | 'version' | 'hostingModel' | 'lifecycleStatus' | 'status' | 'visibility' | 'createdAt' | 'organizationId' | 'customData' | 'domainOwnerUserId'> & {
  organization: { id: string; name: string } | null
  applicationCapabilities: { capability: Pick<Capability, 'id' | 'name' | 'domain'> }[]
}

interface Props {
  applications: ApplicationRow[]
  capabilities: Pick<Capability, 'id' | 'name'>[]
  role: Role
  currentOrgId: string
  currentUserId: string
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValueMap: Record<string, EntityTaxonomyValue[]>
  customFieldDefs: CustomFieldDefinition[]
  orgUsers: { id: string; name: string | null; email: string }[]
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

const LIFECYCLE_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  planned: 'bg-blue-100 text-blue-700 border-blue-200',
  sunset: 'bg-amber-100 text-amber-800 border-amber-200',
  retiring: 'bg-amber-100 text-amber-800 border-amber-200',
  decommissioned: 'bg-red-100 text-red-700 border-red-200',
}

const VISIBILITY_STYLES: Record<string, string> = {
  org: 'bg-slate-100 text-slate-600 border-slate-200',
  connections: 'bg-blue-100 text-blue-700 border-blue-200',
  instance: 'bg-violet-100 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<string, string> = {
  org: 'Org only',
  connections: 'Connected orgs',
  instance: 'Instance-wide',
}

const HOSTING_LABELS: Record<string, string> = {
  'on-prem': 'On-premises',
  saas: 'SaaS',
  hybrid: 'Hybrid',
}

// ---------------------------------------------------------------------------
// Risk signal — derived purely from existing fields, no stored score
// ---------------------------------------------------------------------------

type RiskLevel = 'attention' | 'info' | null

interface RiskSignal {
  level: RiskLevel
  label: string
  detail: string
}

function getRiskSignal(app: ApplicationRow): RiskSignal {
  const retiring = app.lifecycleStatus === 'sunset' || app.lifecycleStatus === 'decommissioned'
  const hasCaps = app.applicationCapabilities.length > 0

  if (retiring && hasCaps) {
    return {
      level: 'attention',
      label: 'Retiring with active capabilities',
      detail: `${app.applicationCapabilities.length} ${app.applicationCapabilities.length === 1 ? 'capability' : 'capabilities'} still linked`,
    }
  }

  if (!hasCaps) {
    return {
      level: 'info',
      label: 'No capabilities linked',
      detail: 'This application has no capability coverage recorded',
    }
  }

  return { level: null, label: '', detail: '' }
}

// ---------------------------------------------------------------------------
// Portfolio card
// ---------------------------------------------------------------------------

const MAX_CAP_CHIPS = 4

function PortfolioCard({
  app,
  canEdit,
  canDelete,
  currentOrgId,
  isPending,
  onEdit,
  onDelete,
}: {
  app: ApplicationRow
  canEdit: boolean
  canDelete: boolean
  currentOrgId: string
  isPending: boolean
  onEdit: (a: ApplicationRow) => void
  onDelete: (a: ApplicationRow) => void
}) {
  const signal = getRiskSignal(app)
  const isOwn = app.organizationId === currentOrgId
  const caps = app.applicationCapabilities
  const visibleCaps = caps.slice(0, MAX_CAP_CHIPS)
  const extraCaps = caps.length - MAX_CAP_CHIPS
  const uniqueDomains = Array.from(
    new Set(caps.map(ac => ac.capability.domain).filter(Boolean))
  ) as string[]

  return (
    <div className={cn(
      'rounded-lg border bg-card flex flex-col overflow-hidden',
      signal.level === 'attention' && 'border-amber-300',
    )}>
      {/* Risk banner */}
      {signal.level === 'attention' && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs text-amber-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span><strong>{signal.label}</strong> — {signal.detail}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Header row: lifecycle badge + name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium',
              LIFECYCLE_STYLES[app.lifecycleStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200',
            )}>
              {app.lifecycleStatus.charAt(0).toUpperCase() + app.lifecycleStatus.slice(1)}
            </span>
            <Link href={`/applications/${app.id}`} className="font-semibold text-sm hover:underline truncate">
              {app.name}
            </Link>
            {!isOwn && app.organization && (
              <span className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                {app.organization.name}
              </span>
            )}
          </div>
        </div>

        {/* Vendor / hosting */}
        {(app.vendor || app.hostingModel) && (
          <p className="text-xs text-muted-foreground">
            {[app.vendor, app.hostingModel ? HOSTING_LABELS[app.hostingModel] : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {/* Capabilities */}
        {caps.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {visibleCaps.map(ac => (
              <span key={ac.capability.id} className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-0.5 text-xs text-slate-700 border-slate-200">
                {ac.capability.name}
              </span>
            ))}
            {extraCaps > 0 && (
              <span className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-0.5 text-xs text-slate-500 border-slate-200">
                +{extraCaps} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No capabilities linked</p>
        )}

        {/* Domains */}
        {uniqueDomains.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {uniqueDomains.map(d => <DomainBadge key={d} domain={d} />)}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {canEdit && (
        <div className="flex items-center gap-1 border-t px-3 py-2 bg-muted/30">
          <Link href={`/applications/${app.id}`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
          </Link>
          {isOwn && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onEdit(app)} className="h-7 px-2 text-xs">
                Edit
              </Button>
              {canDelete && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => onDelete(app)}
                  disabled={isPending}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ViewMode = 'table' | 'portfolio'

export function ApplicationTable({ applications, capabilities, role, currentOrgId, currentUserId, taxonomyDefinitions, taxonomyValueMap, customFieldDefs, orgUsers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [hostingFilter, setHostingFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [taxonomyFilters, setTaxonomyFilters] = useState<Record<string, string>>({})

  const orgOptions = Array.from(new Map(
    applications.map(a => [a.organizationId, a.organization?.name ?? 'Unknown'])
  ).entries())

  // Domains are derived from linked capabilities — an app is "in" a domain via its capabilities
  const domainOptions = Array.from(
    new Set(
      applications
        .flatMap(a => a.applicationCapabilities.map(ac => ac.capability.domain))
        .filter(Boolean)
    )
  ).sort() as string[]

  const hostingOptions = Array.from(
    new Set(applications.map(a => a.hostingModel).filter(Boolean))
  ).sort() as string[]

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApplicationRow | null>(null)
  // #567 Part A — unsaved-changes guard.
  const createDirty = useDirtyTracker()
  const editDirty = useDirtyTracker()
  const [deleteTarget, setDeleteTarget] = useState<ApplicationRow | null>(null)

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'

  const refresh = () => router.refresh()

  const filtered = applications.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
    const matchLifecycle = lifecycleFilter === 'all' || a.lifecycleStatus === lifecycleFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchDomain = domainFilter === 'all' || a.applicationCapabilities.some(ac => ac.capability.domain === domainFilter)
    const matchHosting = hostingFilter === 'all' || a.hostingModel === hostingFilter
    const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? a.organizationId === currentOrgId : a.organizationId === orgFilter)
    const matchTaxonomy = Object.entries(taxonomyFilters).every(([, termId]) => {
      if (termId === 'all') return true
      return (taxonomyValueMap[a.id] ?? []).some(v => v.taxonomyTermId === termId)
    })
    return matchSearch && matchLifecycle && matchStatus && matchDomain && matchHosting && matchOrg && matchTaxonomy
  })

  // Portfolio sort: attention items first, then alphabetical
  const portfolioSorted = [...filtered].sort((a, b) => {
    const la = getRiskSignal(a).level
    const lb = getRiskSignal(b).level
    const rank = (l: RiskLevel) => l === 'attention' ? 0 : l === 'info' ? 1 : 2
    const diff = rank(la) - rank(lb)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })

  // Summary count for portfolio banner
  const attentionCount = portfolioSorted.filter(a => getRiskSignal(a).level === 'attention').length

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await submitWithDuplicateAck(createApplication, formData)
        createDirty.reset()
        setCreateOpen(false)
        refresh()
      } catch (err) {
        if (typeof window !== 'undefined') {
          window.alert(err instanceof Error ? err.message : 'Create failed')
        }
      }
    })
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    startTransition(async () => {
      try {
        await editApplication(editTarget.id, formData)
        editDirty.reset()
        setEditTarget(null)
        refresh()
      } catch (err) {
        // #381 PR-3 publish-time debt gate: confirm + re-submit with ack.
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Publishing requires acknowledgment')) {
          if (typeof window !== 'undefined' && window.confirm(msg + '\n\nPublish anyway? Your acknowledgment will be logged in the audit trail.')) {
            formData.set('acknowledgeOpenDebt', 'on')
            await editApplication(editTarget.id, formData)
            editDirty.reset()
            setEditTarget(null)
            refresh()
            return
          }
        }
        // #567 Part B — publish-readiness gate.
        if (msg.includes('Publishing this') && msg.includes('makes the record harder to use')) {
          if (typeof window !== 'undefined' && window.confirm(msg + '\n\nPublish anyway? The missing fields will be logged in the audit trail.')) {
            formData.set('acknowledgePublishIncomplete', 'on')
            await editApplication(editTarget.id, formData)
            setEditTarget(null)
            refresh()
            return
          }
        }
        throw err
      }
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteApplication(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  async function handleImportPreview() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      const result = await importApplications(fd, true)
      setImportPreview(result)
    })
  }

  async function handleImportConfirm() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      const result = await importApplications(fd, false)
      setImportResult(result)
      setImportPreview(null)
      setImportFile(null)
      refresh()
    })
  }

  function openImport() {
    setImportOpen(true)
    setImportResult(null)
    setImportPreview(null)
    setImportFile(null)
  }

  const selectClass = 'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search applications…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
        <select
          aria-label="Filter by lifecycle"
          value={lifecycleFilter}
          onChange={e => setLifecycleFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All lifecycle statuses</option>
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="sunset">Sunset</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
        {/* Status filter hidden in portfolio view — less relevant for leadership */}
        {viewMode === 'table' && (
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        )}
        {domainOptions.length > 0 && (
          <select
            aria-label="Filter by domain"
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All domains</option>
            {domainOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {hostingOptions.length > 0 && (
          <select
            aria-label="Filter by hosting model"
            value={hostingFilter}
            onChange={e => setHostingFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All hosting models</option>
            {hostingOptions.map(h => (
              <option key={h} value={h}>{HOSTING_LABELS[h] ?? h}</option>
            ))}
          </select>
        )}
        <TaxonomyFilters
          defs={taxonomyDefinitions}
          filters={taxonomyFilters}
          onFilterChange={(defId, value) => setTaxonomyFilters(prev => ({ ...prev, [defId]: value }))}
        />
        {orgOptions.length > 1 && (
          <select aria-label="Filter by organization" value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className={selectClass}>
            <option value="all">All organizations</option>
            <option value="own">My organization</option>
            {orgOptions.filter(([id]) => id !== currentOrgId).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-md border border-input overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'px-3 h-9 text-sm font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('portfolio')}
            className={cn(
              'px-3 h-9 text-sm font-medium transition-colors border-l border-input',
              viewMode === 'portfolio'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            Portfolio
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <a href="/api/applications/export">
            <Button variant="outline" size="sm">Export CSV</Button>
          </a>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={openImport}>Import CSV</Button>
              <Button onClick={() => setCreateOpen(true)} size="sm">+ New Application</Button>
            </>
          )}
        </div>
      </div>

      {/* Portfolio summary banner */}
      {viewMode === 'portfolio' && attentionCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-amber-600">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>{attentionCount} {attentionCount === 1 ? 'application' : 'applications'}</strong>{' '}
            retiring while still supporting active capabilities — review or re-map before decommission.
          </span>
        </div>
      )}

      {/* Empty state — when the org has no applications at all (#587 follow-up). */}
      {applications.length === 0 && (
        <EmptyStateCTA
          entityLabel="application"
          description="Applications are the systems and platforms your organization runs to deliver services and capabilities."
          onAdd={canEdit ? () => setCreateOpen(true) : undefined}
          canApplyStarterPack={role === 'admin'}
        />
      )}

      {/* Table view */}
      {viewMode === 'table' && applications.length > 0 && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-10">
                    {applications.length === 0 ? (
                      <div className="space-y-3">
                        <p>No applications yet.</p>
                        {canEdit && (
                          <p className="text-xs">
                            Add your first application, or{' '}
                            <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
                              apply a starter pack in Settings
                            </Link>{' '}
                            to populate a small example city.
                          </p>
                        )}
                      </div>
                    ) : (
                      'No applications match the current filters.'
                    )}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link href={`/applications/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                      {a.organizationId !== currentOrgId && a.organization && (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                          {a.organization.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.vendor ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const uniqueDomains = Array.from(
                          new Set(a.applicationCapabilities.map(ac => ac.capability.domain).filter(Boolean))
                        ) as string[]
                        return uniqueDomains.length === 0
                          ? <span className="text-muted-foreground text-sm">—</span>
                          : uniqueDomains.map(d => <DomainBadge key={d} domain={d} />)
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.applicationCapabilities.length === 0
                        ? <span className="text-muted-foreground text-sm">—</span>
                        : a.applicationCapabilities.map(ac => (
                          <span key={ac.capability.id} className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-0.5 text-xs text-slate-700 border-slate-200">
                            {ac.capability.name}
                          </span>
                        ))
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LIFECYCLE_STYLES[a.lifecycleStatus])}>
                      {a.lifecycleStatus.charAt(0).toUpperCase() + a.lifecycleStatus.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[a.status])}>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[a.visibility])}>
                      {VISIBILITY_LABELS[a.visibility]}
                    </span>
                  </TableCell>
                  {canEdit && a.organizationId === currentOrgId && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/applications/${a.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(a)} className="h-7 px-2 text-xs">
                          Edit
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteTarget(a)}
                            disabled={isPending}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {canEdit && a.organizationId !== currentOrgId && (
                    <TableCell>
                      <Link href={`/applications/${a.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Portfolio view */}
      {viewMode === 'portfolio' && applications.length > 0 && (
        <div>
          {portfolioSorted.length === 0 ? (
            applications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm space-y-3">
                <p>No applications yet.</p>
                {canEdit && (
                  <p className="text-xs">
                    Add your first application, or{' '}
                    <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
                      apply a starter pack in Settings
                    </Link>{' '}
                    to populate a small example city.
                  </p>
                )}
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground text-sm">
                No applications match the current filters.
              </p>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioSorted.map(a => (
                <PortfolioCard
                  key={a.id}
                  app={a}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  currentOrgId={currentOrgId}
                  isPending={isPending}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o && !confirmDiscard(createDirty)) return
          if (!o) createDirty.reset()
          setCreateOpen(o)
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Application</DialogTitle></DialogHeader>
          <form action={handleCreate} onChange={createDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="Markdown supported" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vendor" name="vendor" />
              <FormField label="Version" name="version" />
            </div>
            <div className="space-y-1.5">
              <Label>Hosting model</Label>
              <select name="hostingModel" defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                <option value="on-prem">On-premises</option>
                <option value="saas">SaaS</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Capabilities</Label>
              <div className="rounded-md border border-input bg-transparent px-3 py-2 max-h-36 overflow-y-auto space-y-1">
                {capabilities.length === 0
                  ? <p className="text-sm text-muted-foreground">No capabilities yet.</p>
                  : capabilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="capabilityIds" value={c.id} className="rounded" />
                      {c.name}
                    </label>
                  ))
                }
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lifecycle</Label>
                <select name="lifecycleStatus" defaultValue="active" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="sunset">Sunset</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select name="status" defaultValue="draft" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={[]} />
            <CustomFieldInputs fields={customFieldDefs} />
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <select name="visibility" defaultValue="org" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="org">Org only</option>
                <option value="connections">Connected orgs</option>
                <option value="instance">Instance-wide</option>
              </select>
            </div>
            <DomainOwnerFormSection
              currentUserId={currentUserId}
              initialOwnerUserId={null}
              orgUsers={orgUsers}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(createDirty)) { createDirty.reset(); setCreateOpen(false) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create application'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={open => {
          if (!open && !confirmDiscard(editDirty)) return
          if (!open) { editDirty.reset(); setEditTarget(null) }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Application</DialogTitle></DialogHeader>
          <form action={handleEdit} onChange={editDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vendor" name="vendor" defaultValue={editTarget?.vendor ?? ''} />
              <FormField label="Version" name="version" defaultValue={editTarget?.version ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label>Hosting model</Label>
              <select name="hostingModel" defaultValue={editTarget?.hostingModel ?? ''} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                <option value="on-prem">On-premises</option>
                <option value="saas">SaaS</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Capabilities</Label>
              <div className="rounded-md border border-input bg-transparent px-3 py-2 max-h-36 overflow-y-auto space-y-1">
                {capabilities.length === 0
                  ? <p className="text-sm text-muted-foreground">No capabilities yet.</p>
                  : capabilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        name="capabilityIds"
                        value={c.id}
                        defaultChecked={editTarget?.applicationCapabilities.some(ac => ac.capability.id === c.id)}
                        className="rounded"
                      />
                      {c.name}
                    </label>
                  ))
                }
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lifecycle</Label>
                <select name="lifecycleStatus" defaultValue={editTarget?.lifecycleStatus} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="sunset">Sunset</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select name="status" defaultValue={editTarget?.status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <TaxonomyInputs
              defs={taxonomyDefinitions}
              currentValues={taxonomyValueMap[editTarget?.id ?? ''] ?? []}
            />
            <CustomFieldInputs fields={customFieldDefs} values={editTarget?.customData ?? {}} />
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <select name="visibility" defaultValue={editTarget?.visibility ?? 'org'} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="org">Org only</option>
                <option value="connections">Connected orgs</option>
                <option value="instance">Instance-wide</option>
              </select>
            </div>
            {editTarget && (
              <DomainOwnerFormSection
                currentUserId={currentUserId}
                initialOwnerUserId={editTarget.domainOwnerUserId}
                orgUsers={orgUsers}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { if (confirmDiscard(editDirty)) { editDirty.reset(); setEditTarget(null) } }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Application</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) setImportOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Applications</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload a CSV with columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">vendor</code>, <code className="bg-muted px-1 rounded">version</code>, <code className="bg-muted px-1 rounded">hosting_model</code>, <code className="bg-muted px-1 rounded">lifecycle_status</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">capabilities</code> (semicolon-separated names)
              {customFieldDefs.length > 0 && <>, plus custom fields: {customFieldDefs.map(f => <code key={f.name} className="bg-muted px-1 rounded ml-1">{f.name}</code>)}</>}.
              Existing applications are matched by name and updated.
            </p>

            {!importResult && (
              <div className="space-y-1.5">
                <Label>CSV file</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null) }}
                />
              </div>
            )}

            {importPreview && !importResult && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="font-medium">Preview</p>
                <p>Will create <strong>{importPreview.created}</strong> · update <strong>{importPreview.updated}</strong> · skip <strong>{importPreview.skipped}</strong></p>
                {importPreview.errors.length > 0 && (
                  <ul className="text-destructive space-y-0.5 mt-1">
                    {importPreview.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {importResult && (
              <div className="rounded-md border bg-emerald-50 border-emerald-200 p-3 space-y-1">
                <p className="font-medium text-emerald-800">Import complete</p>
                <p className="text-emerald-700">Created <strong>{importResult.created}</strong> · updated <strong>{importResult.updated}</strong> · skipped <strong>{importResult.skipped}</strong></p>
                {importResult.errors.length > 0 && (
                  <ul className="text-destructive space-y-0.5 mt-1">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && !importPreview && (
              <Button onClick={handleImportPreview} disabled={!importFile || isPending}>
                {isPending ? 'Checking…' : 'Preview'}
              </Button>
            )}
            {importPreview && !importResult && (
              <Button onClick={handleImportConfirm} disabled={isPending || importPreview.created + importPreview.updated === 0}>
                {isPending ? 'Importing…' : `Import ${importPreview.created + importPreview.updated} records`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  )
}

