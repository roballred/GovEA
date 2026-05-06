'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editPrinciple } from '@/actions/principles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TaxonomyInputs, type EnrichedTaxonomyDefinition } from '@/components/taxonomy-ui'
import type { EntityTaxonomyValue } from '@/db/schema'

interface PrincipleType {
  id: string
  name: string
  slug: string
}

interface PrincipleEditButtonProps {
  principleId: string
  initial: {
    name: string
    description: string | null
    title: string | null
    rationale: string | null
    implications: string | null
    principleType: string
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
  }
  principleTypes: PrincipleType[]
  taxonomyDefinitions?: EnrichedTaxonomyDefinition[]
  currentTaxonomyValues?: EntityTaxonomyValue[]
}

export function PrincipleEditButton({ principleId, initial, principleTypes, taxonomyDefinitions = [], currentTaxonomyValues = [] }: PrincipleEditButtonProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit principle
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
        await editPrinciple(principleId, formData)
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
        <h3 className="text-sm font-semibold">Edit Principle</h3>
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
          <MarkdownEditor label="Description" name="description" defaultValue={initial.description ?? ''} rows={2} placeholder="Markdown supported" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Statement" name="title" defaultValue={initial.title ?? ''} rows={2} placeholder="The principle stated as a directive" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Rationale" name="rationale" defaultValue={initial.rationale ?? ''} rows={3} placeholder="Why this principle matters" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Implications" name="implications" defaultValue={initial.implications ?? ''} rows={3} placeholder="What following this principle requires" />
        </div>

        {principleTypes.length > 0 && (
          <div className="space-y-1">
            <Label>Type</Label>
            <select name="principleType" defaultValue={initial.principleType} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {principleTypes.map(t => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

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
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}
