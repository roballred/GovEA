'use client'

import { useState, useTransition } from 'react'
import type {
  DataEntity, DataAttribute, DataLink, DataBusinessKey,
  PhysicalAttributeType, PhysicalLinkType,
} from '@/db/schema'
import {
  type DataVaultPrefix,
  DATA_VAULT_PREFIX_LABELS,
  suggestDataVaultName,
  matchesDataVaultPrefix,
} from '@/lib/data-vault-naming'

type Status = 'draft' | 'published' | 'archived'
type Visibility = 'org' | 'connections' | 'instance'

interface PersonaOption {
  id: string
  name: string
}

interface EntityOption {
  id: string
  name: string
}

const STATUSES: { value: Status; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
]

const VISIBILITIES: { value: Visibility; label: string }[] = [
  { value: 'org',         label: 'Org (private)' },
  { value: 'connections', label: 'Connections' },
  { value: 'instance',    label: 'Instance-wide' },
]

const PHYSICAL_ATTRIBUTE_TYPES: { value: PhysicalAttributeType; label: string }[] = [
  { value: 'effectivity',     label: 'Effectivity' },
  { value: 'multi-active',    label: 'Multi-Active' },
  { value: 'record-tracking', label: 'Record Tracking' },
  { value: 'status-tracking', label: 'Status Tracking' },
]

const PHYSICAL_LINK_TYPES: { value: PhysicalLinkType; label: string }[] = [
  { value: 'same-as',      label: 'Same-As' },
  { value: 'hierarchical', label: 'Hierarchical' },
]

// ── Shared field building blocks ────────────────────────────────────────────

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="name" className="text-sm font-medium">Name</label>
      <input
        id="name" name="name" required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}

/**
 * #570 — Soft Data Vault naming hint for physical-table-name fields.
 *
 * Shows the convention as helper text, offers a one-click suggestion derived
 * from the entity / link / attribute name, and gently flags values that
 * don't match the expected prefix. Submit is never blocked — orgs that
 * don't run Data Vault keep full control.
 */
function PhysicalTableNameField({
  id, prefix, sourceName, value, onChange, placeholder,
}: {
  id: string
  prefix: DataVaultPrefix
  /** The "Customer Order" entity / link / attribute name suggestions are derived from. */
  sourceName: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const kindLabel = DATA_VAULT_PREFIX_LABELS[prefix]
  const suggestion = suggestDataVaultName(prefix, sourceName)
  const canSuggest = !!suggestion && value !== suggestion
  const trimmed = value.trim()
  const looksOff = trimmed.length > 0 && !matchesDataVaultPrefix(prefix, trimmed)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Physical {kindLabel} Table Name <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id} name={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono"
        />
        {canSuggest && (
          <button
            type="button"
            onClick={() => onChange(suggestion)}
            className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted whitespace-nowrap"
            title={`Fill with "${suggestion}"`}
          >
            Suggest: <code className="font-mono">{suggestion}</code>
          </button>
        )}
      </div>
      <p className={`text-xs ${looksOff ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
        {looksOff
          ? `This doesn't look like a Data Vault ${kindLabel} name (expected to start with "${prefix}_"). You can keep it as-is, or use the Suggest button.`
          : `Data Vault convention: ${kindLabel}s are prefixed with "${prefix}_" (e.g. ${prefix}_${prefix === 's' ? 'customer_profile' : prefix === 'l' ? 'customer_order' : 'customer'}).`}
      </p>
    </div>
  )
}

function DescriptionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="description" className="text-sm font-medium">Description</label>
      <textarea
        id="description" name="description"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
      />
    </div>
  )
}

function StatusVisibilityRow({
  status, onStatus, visibility, onVisibility,
}: {
  status: Status
  onStatus: (v: Status) => void
  visibility: Visibility
  onVisibility: (v: Visibility) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="status" className="text-sm font-medium">Status</label>
        <select id="status" name="status" value={status} onChange={e => onStatus(e.target.value as Status)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm">
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="visibility" className="text-sm font-medium">Visibility</label>
        <select id="visibility" name="visibility" value={visibility} onChange={e => onVisibility(e.target.value as Visibility)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm">
          {VISIBILITIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>
    </div>
  )
}

function PhysicalLocationFields({
  server, onServer, database, onDatabase, schema, onSchema,
}: {
  server: string; onServer: (v: string) => void
  database: string; onDatabase: (v: string) => void
  schema: string; onSchema: (v: string) => void
}) {
  return (
    <fieldset className="space-y-3 rounded-md border bg-card px-4 py-3">
      <legend className="text-sm font-medium px-1">Physical location <span className="text-muted-foreground font-normal">(optional)</span></legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="serverName" className="text-xs font-medium text-muted-foreground">Server</label>
          <input id="serverName" name="serverName" value={server} onChange={e => onServer(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="databaseName" className="text-xs font-medium text-muted-foreground">Database</label>
          <input id="databaseName" name="databaseName" value={database} onChange={e => onDatabase(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="schemaName" className="text-xs font-medium text-muted-foreground">Schema</label>
          <input id="schemaName" name="schemaName" value={schema} onChange={e => onSchema(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
        </div>
      </div>
    </fieldset>
  )
}

function OwnersField({
  personas, selected, onChange,
}: {
  personas: PersonaOption[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  if (personas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No personas available — seed at least one persona to assign an owner.
      </p>
    )
  }
  return (
    <details className="rounded-md border bg-card px-4 py-2">
      <summary className="text-sm font-medium cursor-pointer">
        Owners <span className="text-muted-foreground font-normal">({selected.length} selected)</span>
      </summary>
      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
        {personas.map(p => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={e => onChange(e.target.checked
                ? [...selected, p.id]
                : selected.filter(id => id !== p.id))}
            />
            {p.name}
          </label>
        ))}
      </div>
    </details>
  )
}

function FormFooter({ isPending, isEdit, error }: { isPending: boolean; isEdit: boolean; error: string | null }) {
  return (
    <>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </button>
      </div>
    </>
  )
}

// ── Entity form ─────────────────────────────────────────────────────────────

export function DataEntityForm({
  initial, personas, action, successHref,
}: {
  initial?: DataEntity & { ownerPersonaIds: string[] }
  personas: PersonaOption[]
  action: (formData: FormData) => Promise<unknown>
  successHref?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<Status>(initial?.status ?? 'draft')
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'org')
  const [physicalHubTableName, setHub] = useState(initial?.physicalHubTableName ?? '')
  const [serverName, setServer] = useState(initial?.serverName ?? '')
  const [databaseName, setDatabase] = useState(initial?.databaseName ?? '')
  const [schemaName, setSchema] = useState(initial?.schemaName ?? '')
  const [owners, setOwners] = useState<string[]>(initial?.ownerPersonaIds ?? [])
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    owners.forEach(id => fd.append('ownerPersonaIds', id))
    startTransition(async () => {
      try {
        await action(fd)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <NameField value={name} onChange={setName} />
      <DescriptionField value={description ?? ''} onChange={setDescription} />
      <StatusVisibilityRow status={status} onStatus={setStatus} visibility={visibility} onVisibility={setVisibility} />
      <PhysicalTableNameField
        id="physicalHubTableName"
        prefix="h"
        sourceName={name}
        value={physicalHubTableName ?? ''}
        onChange={setHub}
        placeholder="e.g. h_customer"
      />
      <PhysicalLocationFields
        server={serverName ?? ''} onServer={setServer}
        database={databaseName ?? ''} onDatabase={setDatabase}
        schema={schemaName ?? ''} onSchema={setSchema}
      />
      <OwnersField personas={personas} selected={owners} onChange={setOwners} />
      <FormFooter isPending={isPending} isEdit={!!initial} error={formError} />
    </form>
  )
}

// ── Attribute form ──────────────────────────────────────────────────────────

export function DataAttributeForm({
  initial, personas, action, successHref,
}: {
  initial?: DataAttribute & { ownerPersonaIds: string[] }
  personas: PersonaOption[]
  action: (formData: FormData) => Promise<unknown>
  successHref?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<Status>(initial?.status ?? 'draft')
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'org')
  const [physicalSatelliteTableName, setSat] = useState(initial?.physicalSatelliteTableName ?? '')
  const [physicalAttributeType, setAttrType] = useState<PhysicalAttributeType | ''>(
    (initial?.physicalAttributeType as PhysicalAttributeType | null) ?? '',
  )
  const [serverName, setServer] = useState(initial?.serverName ?? '')
  const [databaseName, setDatabase] = useState(initial?.databaseName ?? '')
  const [schemaName, setSchema] = useState(initial?.schemaName ?? '')
  const [owners, setOwners] = useState<string[]>(initial?.ownerPersonaIds ?? [])
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    owners.forEach(id => fd.append('ownerPersonaIds', id))
    startTransition(async () => {
      try {
        await action(fd)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <NameField value={name} onChange={setName} />
      <DescriptionField value={description ?? ''} onChange={setDescription} />
      <StatusVisibilityRow status={status} onStatus={setStatus} visibility={visibility} onVisibility={setVisibility} />
      <div className="grid gap-4 sm:grid-cols-2">
        <PhysicalTableNameField
          id="physicalSatelliteTableName"
          prefix="s"
          sourceName={name}
          value={physicalSatelliteTableName ?? ''}
          onChange={setSat}
          placeholder="e.g. s_customer_profile"
        />
        <div className="space-y-1.5">
          <label htmlFor="physicalAttributeType" className="text-sm font-medium">
            Physical Attribute Type
          </label>
          <select
            id="physicalAttributeType" name="physicalAttributeType"
            value={physicalAttributeType}
            onChange={e => setAttrType(e.target.value as PhysicalAttributeType | '')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Not set —</option>
            {PHYSICAL_ATTRIBUTE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <PhysicalLocationFields
        server={serverName ?? ''} onServer={setServer}
        database={databaseName ?? ''} onDatabase={setDatabase}
        schema={schemaName ?? ''} onSchema={setSchema}
      />
      <OwnersField personas={personas} selected={owners} onChange={setOwners} />
      <FormFooter isPending={isPending} isEdit={!!initial} error={formError} />
    </form>
  )
}

// ── Link form ───────────────────────────────────────────────────────────────

export function DataLinkForm({
  initial, personas, action, successHref,
}: {
  initial?: DataLink & { ownerPersonaIds: string[] }
  personas: PersonaOption[]
  action: (formData: FormData) => Promise<unknown>
  successHref?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<Status>(initial?.status ?? 'draft')
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'org')
  const [physicalLinkTableName, setLink] = useState(initial?.physicalLinkTableName ?? '')
  const [physicalLinkType, setLinkType] = useState<PhysicalLinkType | ''>(
    (initial?.physicalLinkType as PhysicalLinkType | null) ?? '',
  )
  const [serverName, setServer] = useState(initial?.serverName ?? '')
  const [databaseName, setDatabase] = useState(initial?.databaseName ?? '')
  const [schemaName, setSchema] = useState(initial?.schemaName ?? '')
  const [owners, setOwners] = useState<string[]>(initial?.ownerPersonaIds ?? [])
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    owners.forEach(id => fd.append('ownerPersonaIds', id))
    startTransition(async () => {
      try {
        await action(fd)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <NameField value={name} onChange={setName} />
      <DescriptionField value={description ?? ''} onChange={setDescription} />
      <StatusVisibilityRow status={status} onStatus={setStatus} visibility={visibility} onVisibility={setVisibility} />
      <div className="grid gap-4 sm:grid-cols-2">
        <PhysicalTableNameField
          id="physicalLinkTableName"
          prefix="l"
          sourceName={name}
          value={physicalLinkTableName ?? ''}
          onChange={setLink}
          placeholder="e.g. l_customer_address"
        />
        <div className="space-y-1.5">
          <label htmlFor="physicalLinkType" className="text-sm font-medium">
            Physical Relationship Type
          </label>
          <select
            id="physicalLinkType" name="physicalLinkType"
            value={physicalLinkType}
            onChange={e => setLinkType(e.target.value as PhysicalLinkType | '')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Not set —</option>
            {PHYSICAL_LINK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <PhysicalLocationFields
        server={serverName ?? ''} onServer={setServer}
        database={databaseName ?? ''} onDatabase={setDatabase}
        schema={schemaName ?? ''} onSchema={setSchema}
      />
      <OwnersField personas={personas} selected={owners} onChange={setOwners} />
      <FormFooter isPending={isPending} isEdit={!!initial} error={formError} />
    </form>
  )
}

// ── BusinessKey form ────────────────────────────────────────────────────────

export function DataBusinessKeyForm({
  initial, personas, entities, action, successHref,
}: {
  initial?: DataBusinessKey & { ownerPersonaIds: string[] }
  personas: PersonaOption[]
  entities: EntityOption[]
  action: (formData: FormData) => Promise<unknown>
  successHref?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<Status>(initial?.status ?? 'draft')
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'org')
  const [dataType, setDataType] = useState(initial?.dataType ?? '')
  const [owningDataEntityId, setOwning] = useState(
    initial?.owningDataEntityId ?? entities[0]?.id ?? '',
  )
  const [owners, setOwners] = useState<string[]>(initial?.ownerPersonaIds ?? [])
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!owningDataEntityId) {
      setFormError('A business key must be attached to an owning entity.')
      return
    }
    const fd = new FormData(e.currentTarget)
    owners.forEach(id => fd.append('ownerPersonaIds', id))
    startTransition(async () => {
      try {
        await action(fd)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  if (entities.length === 0) {
    return (
      <div className="rounded-md border bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
        Create at least one <strong>entity</strong> first — a business key has to instantiate an entity.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <NameField value={name} onChange={setName} />
      <DescriptionField value={description ?? ''} onChange={setDescription} />
      <StatusVisibilityRow status={status} onStatus={setStatus} visibility={visibility} onVisibility={setVisibility} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="owningDataEntityId" className="text-sm font-medium">Owning entity</label>
          <select
            id="owningDataEntityId" name="owningDataEntityId" required
            value={owningDataEntityId}
            onChange={e => setOwning(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">
            The entity (hub) that this business key identifies.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dataType" className="text-sm font-medium">
            Data type <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="dataType" name="dataType"
            value={dataType ?? ''}
            onChange={e => setDataType(e.target.value)}
            placeholder="e.g. VARCHAR(64), UUID, INTEGER"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
      <OwnersField personas={personas} selected={owners} onChange={setOwners} />
      <FormFooter isPending={isPending} isEdit={!!initial} error={formError} />
    </form>
  )
}
