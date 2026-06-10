'use client'

import { useState, useTransition } from 'react'
import type { Capability, Persona, EntityTaxonomyValue } from '@/db/schema'
import { createCapability, editCapability, deleteCapability, importCapabilities, type CapabilityImportResult } from '@/actions/capabilities'
import { TaxonomyFilters, TaxonomyInputs, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DomainCombobox } from '@/components/domain-combobox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DomainBadge } from '@/components/domain-badge'
import type { Role } from '@/lib/rbac'
import { MarkdownEditor } from '@/components/markdown-editor'
import { buildCapabilityTree, flattenTree, collectDescendantIds, resolveCapabilityDomain } from '@/lib/capability-tree'
import { submitWithDuplicateAck } from '@/lib/duplicate-name-client'
import { useDirtyTracker, confirmDiscard } from '@/lib/use-dirty-dialog'
import { EmptyStateCTA } from '@/components/empty-state-cta'
import { DomainOwnerFormSection } from '@/components/domain-owner-form-section'

type CapabilityRow = Pick<Capability, 'id' | 'name' | 'description' | 'domain' | 'behaviors' | 'rules' | 'capabilityType' | 'status' | 'visibility' | 'createdAt' | 'organizationId' | 'domainOwnerUserId'> & {
  organization: { id: string; name: string } | null
  capabilityPersonas: { persona: Pick<Persona, 'id' | 'name'> }[]
  childRelationships: { parentId: string; childId: string }[]
  parentRelationships: { parentId: string; childId: string }[]
}

interface Props {
  capabilities: CapabilityRow[]
  personas: Pick<Persona, 'id' | 'name'>[]
  domainTerms: { id: string; name: string }[]
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValueMap: Record<string, EntityTaxonomyValue[]>
  role: Role
  currentOrgId: string
  currentUserId: string
  orgUsers: { id: string; name: string | null; email: string }[]
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
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

const TYPE_STYLES: Record<string, string> = {
  business: 'bg-violet-100 text-violet-800 border-violet-200',
  technical: 'bg-cyan-100 text-cyan-800 border-cyan-200',
}

export function CapabilityTable({ capabilities, personas, domainTerms, taxonomyDefinitions, taxonomyValueMap, role, currentOrgId, currentUserId, orgUsers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [taxonomyFilters, setTaxonomyFilters] = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const orgOptions = Array.from(new Map(
    capabilities.map(c => [c.organizationId, c.organization?.name ?? 'Unknown'])
  ).entries())

  const capById = new Map(capabilities.map(c => [c.id, c]))

  const domainOptions = Array.from(
    new Set(capabilities.map(c => resolveCapabilityDomain(c.id, capById)).filter(Boolean))
  ).sort() as string[]

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CapabilityRow | null>(null)
  // #567 Part A — track unsaved changes on the create/edit forms so closing
  // the dialog or hitting Cancel doesn't silently discard work.
  const createDirty = useDirtyTracker()
  const editDirty = useDirtyTracker()
  const [deleteTarget, setDeleteTarget] = useState<CapabilityRow | null>(null)

  // CSV import dialog state (#596). Two-step flow: preview (dryRun) →
  // confirm. Same shape as Applications import.
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<CapabilityImportResult | null>(null)
  const [importResult, setImportResult] = useState<CapabilityImportResult | null>(null)

  async function handleImportPreview() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      const result = await importCapabilities(fd, true)
      setImportPreview(result)
    })
  }

  async function handleImportConfirm() {
    if (!importFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('csvFile', importFile)
      const result = await importCapabilities(fd, false)
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

  const canEdit = role === 'admin' || role === 'contributor'
  const canDelete = role === 'admin'

  const refresh = () => router.refresh()

  const hasTaxonomyFilter = Object.values(taxonomyFilters).some(v => v !== 'all')
  const hasFilter = search || statusFilter !== 'all' || typeFilter !== 'all' || domainFilter !== 'all' || orgFilter !== 'all' || hasTaxonomyFilter

  // Build tree from full capability list
  const tree = buildCapabilityTree(capabilities)
  const flatTree = flattenTree(tree, collapsed)

  // Apply filters — when active, show flat matching rows; when inactive, show tree
  const displayRows = hasFilter
    ? capabilities.filter(c => {
        const resolvedDomain = resolveCapabilityDomain(c.id, capById)
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || c.status === statusFilter
        const matchType = typeFilter === 'all' || c.capabilityType === typeFilter
        const matchDomain = domainFilter === 'all' || resolvedDomain === domainFilter
        const matchOrg = orgFilter === 'all' || (orgFilter === 'own' ? c.organizationId === currentOrgId : c.organizationId === orgFilter)
        const matchTaxonomy = Object.entries(taxonomyFilters).every(([, termId]) =>
          termId === 'all' || (taxonomyValueMap[c.id] ?? []).some(v => v.taxonomyTermId === termId)
        )
        return matchSearch && matchStatus && matchType && matchDomain && matchOrg && matchTaxonomy
      }).map(c => ({ cap: c, depth: 0, children: [] }))
    : flatTree

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await submitWithDuplicateAck(createCapability, formData)
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
        await editCapability(editTarget.id, formData)
        editDirty.reset()
        setEditTarget(null)
        refresh()
      } catch (err) {
        // #381 PR-3 publish-time debt gate: explicit confirmation flow.
        // Server throws when transitioning to published with linked critical/high
        // open debt and no ack. We prompt the user, then re-submit with the ack.
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Publishing requires acknowledgment')) {
          if (typeof window !== 'undefined' && window.confirm(msg + '\n\nPublish anyway? Your acknowledgment will be logged in the audit trail.')) {
            formData.set('acknowledgeOpenDebt', 'on')
            await editCapability(editTarget.id, formData)
            editDirty.reset()
            setEditTarget(null)
            refresh()
            return
          }
        }
        // #567 Part B — publish-readiness gate: prompt + ack-retry pattern.
        if (msg.includes('Publishing this') && msg.includes('makes the record harder to use')) {
          if (typeof window !== 'undefined' && window.confirm(msg + '\n\nPublish anyway? The missing fields will be logged in the audit trail.')) {
            formData.set('acknowledgePublishIncomplete', 'on')
            await editCapability(editTarget.id, formData)
            editDirty.reset()
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
      await deleteCapability(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  // Org-owned caps eligible as parents, excluding self + descendants
  function getParentOptions(excludeId?: string) {
    if (!excludeId) return capabilities.filter(c => c.organizationId === currentOrgId)
    const descendants = collectDescendantIds(excludeId, capById)
    return capabilities.filter(c =>
      c.organizationId === currentOrgId &&
      c.id !== excludeId &&
      !descendants.has(c.id)
    )
  }

  // Current parent of editTarget
  const editTargetParentId = editTarget?.parentRelationships[0]?.parentId ?? ''

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search capabilities…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All types</option>
          <option value="business">Business</option>
          <option value="technical">Technical</option>
        </select>
        {domainOptions.length > 0 && (
          <select
            aria-label="Filter by domain"
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All domains</option>
            {domainOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {orgOptions.length > 1 && (
          <select aria-label="Filter by organization" value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">All organizations</option>
            <option value="own">My organization</option>
            {orgOptions.filter(([id]) => id !== currentOrgId).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
        <TaxonomyFilters
          defs={taxonomyDefinitions}
          filters={taxonomyFilters}
          onFilterChange={(defId, value) => setTaxonomyFilters(prev => ({ ...prev, [defId]: value }))}
        />
        <div className={cn('flex items-center gap-2', canEdit ? 'ml-auto' : 'ml-auto')}>
          <a href="/api/capabilities/export">
            <Button variant="outline" size="sm">Export CSV</Button>
          </a>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={openImport}>Import CSV</Button>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                + New Capability
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty state — when the org has no capabilities at all (not filtered).
          See #587 follow-up for the persona need. */}
      {capabilities.length === 0 ? (
        <EmptyStateCTA
          entityLabel="capability"
          description="Capabilities describe what your organization must be able to do — the foundation everything else maps back to."
          onAdd={canEdit ? () => setCreateOpen(true) : undefined}
          canApplyStarterPack={role === 'admin'}
        />
      ) : (
      <>
      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Personas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-10">
                  {capabilities.length === 0 ? (
                    <div className="space-y-3">
                      <p>No capabilities yet.</p>
                      {canEdit && (
                        <p className="text-xs">
                          Add your first capability, or{' '}
                          <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
                            apply a starter pack in Settings
                          </Link>{' '}
                          to populate a small example city.
                        </p>
                      )}
                    </div>
                  ) : (
                    'No capabilities match the current filters.'
                  )}
                </TableCell>
              </TableRow>
            )}
            {displayRows.map(({ cap: c, depth, children }) => {
              const resolvedDomain = resolveCapabilityDomain(c.id, capById)
              const domainInherited = !c.domain && !!resolvedDomain
              const hasChildren = children.length > 0 || c.childRelationships.length > 0
              const isCollapsed = collapsed.has(c.id)

              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
                      {hasChildren && !hasFilter ? (
                        <button
                          onClick={() => toggleCollapse(c.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors w-4"
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          <svg className={cn('h-3 w-3 transition-transform', !isCollapsed && 'rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={`/capabilities/${c.id}`} className="hover:underline truncate">
                          {c.name}
                        </Link>
                        {c.organizationId !== currentOrgId && c.organization && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200 shrink-0">
                            {c.organization.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.capabilityType
                      ? <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', TYPE_STYLES[c.capabilityType])}>
                          {c.capabilityType.charAt(0).toUpperCase() + c.capabilityType.slice(1)}
                        </span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    {resolvedDomain
                      ? <span title={domainInherited ? 'Inherited from parent' : undefined}>
                          <DomainBadge domain={resolvedDomain} className={domainInherited ? 'opacity-60' : undefined} />
                        </span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.capabilityPersonas.length === 0
                        ? <span className="text-muted-foreground text-sm">—</span>
                        : c.capabilityPersonas.map(cp => (
                          <span key={cp.persona.id} className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-0.5 text-xs text-slate-700 border-slate-200">
                            {cp.persona.name}
                          </span>
                        ))
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[c.status])}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[c.visibility])}>
                      {VISIBILITY_LABELS[c.visibility]}
                    </span>
                  </TableCell>
                  {canEdit && c.organizationId === currentOrgId && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/capabilities/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(c)} className="h-7 px-2 text-xs">
                          Edit
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteTarget(c)}
                            disabled={isPending}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {canEdit && c.organizationId !== currentOrgId && (
                    <TableCell>
                      <Link href={`/capabilities/${c.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      </>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          // #567 Part A — guard against accidental discard via backdrop / Esc / × button.
          if (!o && !confirmDiscard(createDirty)) return
          if (!o) createDirty.reset()
          setCreateOpen(o)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Capability</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} onChange={createDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required />
            <MarkdownEditor label="Description" name="description" rows={2} placeholder="Markdown supported" />
            <DomainCombobox options={domainTerms.map(t => t.name)} defaultValue="" />
            <div className="space-y-1.5">
              <Label>Capability Type</Label>
              <select name="capabilityType" defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— Not set —</option>
                <option value="business">Business</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <ParentSelector
              options={getParentOptions()}
              defaultValue=""
              label="Parent capability"
            />
            <MarkdownEditor label="Behaviors" name="behaviors" id="create-behaviors" rows={4} placeholder="Markdown supported — use - bullets, **bold**, etc." />
            <MarkdownEditor label="Rules" name="rules" id="create-rules" rows={3} placeholder="Markdown supported — use - bullets, **bold**, etc." />
            {/* #366 — persona links are managed live from the detail page's
                RelationshipPanel, not bulk-replaced on save here. Keeps the
                create / edit dialogs to scalar fields only. */}
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={[]} />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue="draft" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
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
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create capability'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={open => {
          if (!open && !confirmDiscard(editDirty)) return
          if (!open) editDirty.reset()
          if (!open) setEditTarget(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Capability</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} onChange={editDirty.markDirty} className="space-y-3">
            <FormField label="Name" name="name" required defaultValue={editTarget?.name} />
            <MarkdownEditor label="Description" name="description" rows={2} defaultValue={editTarget?.description ?? ''} placeholder="Markdown supported" />
            <DomainCombobox options={domainTerms.map(t => t.name)} defaultValue={editTarget?.domain ?? ''} />
            <div className="space-y-1.5">
              <Label>Capability Type</Label>
              <select name="capabilityType" defaultValue={editTarget?.capabilityType ?? ''} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">— Not set —</option>
                <option value="business">Business</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <ParentSelector
              options={getParentOptions(editTarget?.id)}
              defaultValue={editTargetParentId}
              label="Parent capability"
            />
            <MarkdownEditor label="Behaviors" name="behaviors" id="edit-behaviors" rows={4} defaultValue={editTarget?.behaviors ?? ''} placeholder="Markdown supported — use - bullets, **bold**, etc." />
            <MarkdownEditor label="Rules" name="rules" id="edit-rules" rows={3} defaultValue={editTarget?.rules ?? ''} placeholder="Markdown supported — use - bullets, **bold**, etc." />
            {/* #366 — persona links are managed live from the detail page's
                RelationshipPanel. The bulk checkbox path is removed; the
                existing persona ids are preserved as hidden inputs so the
                edit action's replace-on-save semantics don't silently drop
                them. Same pattern the inline edit button (capability-edit-
                button.tsx) uses. */}
            {editTarget?.capabilityPersonas.map(cp => (
              <input key={cp.persona.id} type="hidden" name="personaIds" value={cp.persona.id} />
            ))}
            <TaxonomyInputs
              defs={taxonomyDefinitions}
              currentValues={taxonomyValueMap[editTarget?.id ?? ''] ?? []}
            />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue={editTarget?.status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
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
          <DialogHeader><DialogTitle>Delete Capability</DialogTitle></DialogHeader>
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

      {/* Import Dialog (#596) */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) setImportOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Capabilities</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload a CSV with columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">domain</code>, <code className="bg-muted px-1 rounded">behaviors</code>, <code className="bg-muted px-1 rounded">rules</code>, <code className="bg-muted px-1 rounded">capability_type</code>, <code className="bg-muted px-1 rounded">status</code>, <code className="bg-muted px-1 rounded">visibility</code>, <code className="bg-muted px-1 rounded">personas</code> (semicolon-separated names).
              Existing capabilities are matched by name and updated. Unknown persona names are reported as warnings without failing the row.
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

function ParentSelector({
  options,
  defaultValue,
  label,
}: {
  options: { id: string; name: string }[]
  defaultValue: string
  label: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        name="parentId"
        defaultValue={defaultValue}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">— None (top-level) —</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  )
}
