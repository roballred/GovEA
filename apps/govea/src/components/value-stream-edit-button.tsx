'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editValueStream } from '@/actions/value-streams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown-editor'

interface ValueStreamEditButtonProps {
  valueStreamId: string
  initial: {
    name: string
    description: string | null
    valueItem: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
  }
  /**
   * Render the form directly instead of behind an "Edit value stream" button.
   * Used on the dedicated edit route (#726) where the page is already the edit
   * surface; save keeps the form open and the page's back link handles return.
   */
  startOpen?: boolean
}

export function ValueStreamEditButton({ valueStreamId, initial, startOpen = false }: ValueStreamEditButtonProps) {
  const [editing, setEditing] = useState(startOpen)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit value stream
        </Button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await editValueStream(valueStreamId, formData)
        router.refresh()
        if (startOpen) setSaved(true)
        else setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Value stream details</h3>
        {!startOpen && (
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300">Details saved.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Name</Label>
          <Input name="name" defaultValue={initial.name} required />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Description" name="description" defaultValue={initial.description ?? ''} rows={3} placeholder="Markdown supported" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Value delivered</Label>
          <Input name="valueItem" defaultValue={initial.valueItem ?? ''} placeholder="What is delivered to the stakeholder?" />
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
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {!startOpen && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        )}
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}
