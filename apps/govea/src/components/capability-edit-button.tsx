'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editCapability } from '@/actions/capabilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyInputs, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import { DomainOwnerFormSection, type OrgUserOption } from '@/components/domain-owner-form-section'
import type { EntityTaxonomyValue } from '@/db/schema'

interface CapabilityEditButtonProps {
  capabilityId: string
  initial: {
    name: string
    description: string | null
    domain: string | null
    capabilityType: 'business' | 'technical' | null
    behaviors: string | null
    rules: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    personaIds: string[]
    parentId: string | null
    domainOwnerUserId: string | null
  }
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  currentTaxonomyValues: EntityTaxonomyValue[]
  currentUserId: string
  orgUsers: OrgUserOption[]
}

export function CapabilityEditButton({ capabilityId, initial, taxonomyDefinitions, currentTaxonomyValues, currentUserId, orgUsers }: CapabilityEditButtonProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit capability
        </Button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await editCapability(capabilityId, formData)
        router.refresh()
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit Capability</h3>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Preserve persona links and parent relationship — not editable here */}
      {initial.personaIds.map(id => (
        <input key={id} type="hidden" name="personaIds" value={id} />
      ))}
      {initial.parentId && (
        <input type="hidden" name="parentId" value={initial.parentId} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Name</Label>
          <Input name="name" defaultValue={initial.name} required />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Description" name="description" defaultValue={initial.description ?? ''} rows={3} placeholder="Markdown supported" />
        </div>

        <div className="space-y-1">
          <Label>Domain</Label>
          <Input name="domain" defaultValue={initial.domain ?? ''} placeholder="e.g. Finance & Revenue" />
        </div>

        <div className="space-y-1">
          <Label>Capability Type</Label>
          <select name="capabilityType" defaultValue={initial.capabilityType ?? ''} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Not set —</option>
            <option value="business">Business</option>
            <option value="technical">Technical</option>
          </select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Behaviors" name="behaviors" defaultValue={initial.behaviors ?? ''} rows={4} placeholder="Markdown supported — use - bullets, **bold**, etc." />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Rules" name="rules" defaultValue={initial.rules ?? ''} rows={3} placeholder="Markdown supported — use - bullets, **bold**, etc." />
        </div>

        {taxonomyDefinitions.length > 0 && (
          <div className="sm:col-span-2">
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={currentTaxonomyValues} />
          </div>
        )}

        <div className="space-y-1">
          <Label>Status</Label>
          <select name="status" defaultValue={initial.status} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label>Visibility</Label>
          <select name="visibility" defaultValue={initial.visibility} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="org">Org only</option>
            <option value="connections">Connected orgs</option>
            <option value="instance">Instance-wide</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <DomainOwnerFormSection
            currentUserId={currentUserId}
            initialOwnerUserId={initial.domainOwnerUserId}
            orgUsers={orgUsers}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}
