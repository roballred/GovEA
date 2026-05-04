'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editService } from '@/actions/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyInputs, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import type { EntityTaxonomyValue } from '@/db/schema'

const CHANNEL_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'in-person', label: 'In-person' },
  { value: 'phone', label: 'Phone' },
  { value: 'mobile', label: 'Mobile' },
]

interface ServiceEditButtonProps {
  serviceId: string
  initial: {
    name: string
    description: string | null
    serviceOwner: string | null
    channels: string[]
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
  }
  taxonomyDefinitions: EnrichedTaxonomyDefinition[]
  taxonomyValues: EntityTaxonomyValue[]
}

export function ServiceEditButton({ serviceId, initial, taxonomyDefinitions, taxonomyValues }: ServiceEditButtonProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit service
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
        await editService(serviceId, formData)
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
        <h3 className="text-sm font-semibold">Edit Service</h3>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</p>
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
          <Label>Service owner</Label>
          <Input name="serviceOwner" defaultValue={initial.serviceOwner ?? ''} placeholder="Team or individual responsible" />
        </div>

        <div className="space-y-1">
          <Label>Channels</Label>
          <div className="flex flex-wrap gap-3 pt-1">
            {CHANNEL_OPTIONS.map(ch => (
              <label key={ch.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" name="channels" value={ch.value} defaultChecked={initial.channels.includes(ch.value)} className="rounded" />
                {ch.label}
              </label>
            ))}
          </div>
        </div>

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

        {taxonomyDefinitions.length > 0 && (
          <div className="sm:col-span-2">
            <TaxonomyInputs defs={taxonomyDefinitions} currentValues={taxonomyValues} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}
