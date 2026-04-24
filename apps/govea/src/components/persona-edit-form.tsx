'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { editPersona } from '@/actions/personas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown-editor'

interface TaxonomyTerm {
  id: string
  name: string
}

interface PersonaEditFormProps {
  personaId: string
  initial: {
    name: string
    description: string | null
    type: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    tagIds: string[]
  }
  personaTypes: TaxonomyTerm[]
  tags: TaxonomyTerm[]
  onCancel: () => void
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const VISIBILITY_OPTIONS = [
  { value: 'org', label: 'Org only' },
  { value: 'connections', label: 'Connected orgs' },
  { value: 'instance', label: 'Instance-wide' },
]

export function PersonaEditForm({
  personaId,
  initial,
  personaTypes,
  tags,
  onCancel,
}: PersonaEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await editPersona(personaId, formData)
        router.refresh()
        onCancel()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit Persona</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="pe-name">Name</Label>
          <Input id="pe-name" name="name" defaultValue={initial.name} required />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor
            id="pe-description"
            label="Description"
            name="description"
            defaultValue={initial.description ?? ''}
            rows={3}
            placeholder="Markdown supported"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pe-type">Type</Label>
          <select
            id="pe-type"
            name="type"
            defaultValue={initial.type ?? ''}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— No type —</option>
            {personaTypes.map(pt => (
              <option key={pt.id} value={pt.name}>{pt.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="pe-status">Status</Label>
          <select
            id="pe-status"
            name="status"
            defaultValue={initial.status}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="pe-visibility">Visibility</Label>
          <select
            id="pe-visibility"
            name="visibility"
            defaultValue={initial.visibility}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {VISIBILITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {tags.length > 0 && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <label key={tag.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    defaultChecked={initial.tagIds.includes(tag.id)}
                    className="rounded border-input"
                  />
                  <span className="text-sm">{tag.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
