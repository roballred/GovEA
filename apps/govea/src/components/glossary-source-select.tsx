'use client'

import { useEffect, useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { isSafeUrl } from '@/lib/url'

export interface GlossarySourceOption {
  name: string
  url?: string | null
  definition?: string | null
}

const CUSTOM = '__custom__'
const NONE = ''

/**
 * Active-reference-source selector (#837).
 *
 * Lets an editor pick which of a term's saved reference sources is the active
 * source — the one that populates `definitionSource` / `definitionSourceUrl` on
 * the term. Emits those two values as hidden inputs so the surrounding <form>
 * carries them through native FormData (works for both the controlled TermForm
 * dialog and the uncontrolled detail-view edit form).
 *
 * Backward compatibility: a term may carry a free-text `definitionSource` that
 * predates the sources table or does not match any saved source name. That
 * value is preserved under the "Custom source" option rather than silently
 * dropped. If a previously-selected saved source is renamed or removed while
 * editing, the prior attribution falls back to Custom so nothing is lost.
 *
 * When `onUseDefinition` is provided and the active selection is a saved source
 * that carries a definition, the control also offers a one-click action to use
 * that source's verbatim definition as the term definition (#849) — coupling
 * the definition text and its attribution in a single place. Selecting "None"
 * or a custom source leaves the existing definition untouched, so original /
 * custom definitions remain fully supported.
 */
export function GlossarySourceSelect({
  sources,
  defaultSource = null,
  defaultSourceUrl = null,
  onChange,
  onUseDefinition,
}: {
  sources: GlossarySourceOption[]
  defaultSource?: string | null
  defaultSourceUrl?: string | null
  onChange?: () => void
  onUseDefinition?: (definition: string) => void
}) {
  const names = sources.map(s => s.name).filter(Boolean)
  const matchesSaved = !!defaultSource && names.includes(defaultSource)

  const [selection, setSelection] = useState<string>(
    matchesSaved ? defaultSource! : defaultSource ? CUSTOM : NONE,
  )
  const [customName, setCustomName] = useState(matchesSaved ? '' : defaultSource ?? '')
  const [customUrl, setCustomUrl] = useState(matchesSaved ? '' : defaultSourceUrl ?? '')

  // If a previously-selected saved source is renamed or removed mid-edit, fall
  // back to Custom and preserve the prior attribution as free text.
  useEffect(() => {
    if (selection !== NONE && selection !== CUSTOM && !names.includes(selection)) {
      setCustomName(selection)
      setCustomUrl('')
      setSelection(CUSTOM)
    }
  }, [names, selection])

  const active = sources.find(s => s.name === selection)
  const effectiveName = selection === CUSTOM ? customName : selection === NONE ? '' : active?.name ?? ''
  const effectiveUrl = selection === CUSTOM ? customUrl : selection === NONE ? '' : active?.url ?? ''

  const selectId = useId()

  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId}>Active reference source</Label>
      <select
        id={selectId}
        value={selection}
        onChange={e => { setSelection(e.target.value); onChange?.() }}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value={NONE}>No source — original definition</option>
        {names.map(n => <option key={n} value={n}>{n}</option>)}
        <option value={CUSTOM}>Custom source…</option>
      </select>

      {selection === CUSTOM && (
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <input
            type="text"
            aria-label="Custom source name"
            placeholder="Source name"
            value={customName}
            onChange={e => { setCustomName(e.target.value); onChange?.() }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="url"
            aria-label="Custom source URL"
            placeholder="https://…"
            value={customUrl}
            onChange={e => { setCustomUrl(e.target.value); onChange?.() }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {selection !== NONE && effectiveName && (
        <p className="text-xs text-muted-foreground">
          Definition attributed to{' '}
          {isSafeUrl(effectiveUrl)
            ? <a href={effectiveUrl!} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{effectiveName}</a>
            : <span className="font-medium">{effectiveName}</span>}.
        </p>
      )}

      {/* Use the selected source's verbatim text as the term definition (#849).
          Sets the definition and keeps this source as the attribution together. */}
      {onUseDefinition && active?.definition && (
        <button
          type="button"
          onClick={() => onUseDefinition(active.definition!)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Use this source&apos;s definition as the term definition
        </button>
      )}

      {selection !== NONE && names.length === 0 && (
        <p className="text-xs text-muted-foreground">No saved sources yet — add one above, or enter a custom attribution.</p>
      )}

      {/* Hidden inputs carry the active-source attribution through native FormData. */}
      <input type="hidden" name="definitionSource" value={effectiveName} />
      <input type="hidden" name="definitionSourceUrl" value={effectiveUrl} />
    </div>
  )
}
