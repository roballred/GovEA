'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editGlossaryTerm } from '@/actions/glossary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown-editor'
import { GlossarySourceSelect, initialSourceSelection, type GlossarySourceOption } from '@/components/glossary-source-select'

interface GlossaryEditButtonProps {
  termId: string
  sources: GlossarySourceOption[]
  initial: {
    term: string
    definition: string
    domain: string | null
    definitionSource: string | null
    definitionSourceUrl: string | null
    notes: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
  }
}

export function GlossaryEditButton({ termId, sources, initial }: GlossaryEditButtonProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [definition, setDefinition] = useState(initial.definition)
  const [activeSource, setActiveSource] = useState<string>(() =>
    initialSourceSelection(initial.definitionSource, sources.map(s => s.name).filter(Boolean))
  )
  const router = useRouter()

  // Adopt a saved source as the term definition: copy its text and make it the
  // active attribution together (#849).
  function adoptSourceAsDefinition(s: GlossarySourceOption) {
    setDefinition(s.definition ?? '')
    if (s.name) setActiveSource(s.name)
  }

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit term
        </Button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('definition', definition)
    startTransition(async () => {
      try {
        await editGlossaryTerm(termId, formData)
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
        <h3 className="text-sm font-semibold">Edit Term</h3>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Term</Label>
          <Input name="term" defaultValue={initial.term} required />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Definition" name="definition" value={definition} onChange={setDefinition} rows={4} placeholder="Markdown supported" />
        </div>

        <div className="space-y-1">
          <Label>Domain</Label>
          <Input name="domain" defaultValue={initial.domain ?? ''} placeholder="e.g. Finance, HR, IT" />
        </div>

        {sources.length > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Reference sources</Label>
            <div className="space-y-2">
              {sources.map(s => (
                <div key={s.name} className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                  <div className="text-sm font-medium">{s.name}</div>
                  {s.definition && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{s.definition}</p>}
                  {s.definition && (
                    <button
                      type="button"
                      onClick={() => adoptSourceAsDefinition(s)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {activeSource === s.name && definition === s.definition
                        ? '✓ Used as the term definition'
                        : 'Use as the term definition'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <GlossarySourceSelect
            sources={sources}
            defaultSource={initial.definitionSource}
            defaultSourceUrl={initial.definitionSourceUrl}
            selectedSource={activeSource}
            onSelectedSourceChange={setActiveSource}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <MarkdownEditor label="Notes" name="notes" defaultValue={initial.notes ?? ''} rows={2} placeholder="Internal notes (Markdown supported)" />
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
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}
