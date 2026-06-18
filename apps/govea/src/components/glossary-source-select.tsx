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
 * Derive the initial selection value for a term's current attribution:
 * a saved source name when it matches one, CUSTOM for free-text attribution
 * that predates / doesn't match a saved source, or NONE when unattributed.
 * Exported so parent forms can own the selection (controlled) and drive it from
 * a "use this source" action while staying consistent with the dropdown.
 */
export function initialSourceSelection(defaultSource: string | null | undefined, names: string[]): string {
  if (defaultSource && names.includes(defaultSource)) return defaultSource
  return defaultSource ? CUSTOM : NONE
}

/**
 * Resolve the term definition when an active reference source is selected (#849).
 *
 * Selecting a saved source that carries definition text adopts that text as the
 * term definition — this is the behavior users repeatedly expected (the active
 * source selection IS "use this source's definition"). "None", "Custom source",
 * and a saved source without definition text all leave the current definition
 * untouched, so original/custom definitions are never clobbered.
 *
 * Pure and exported so both edit surfaces (list/dialog TermForm and the
 * detail-page GlossaryEditButton) share one definition and it can be unit-tested
 * in the node-only test env.
 */
export function definitionForSourceSelection(
  selection: string,
  sources: GlossarySourceOption[],
  currentDefinition: string,
): string {
  const picked = sources.find(s => s.name === selection)
  return picked?.definition ? picked.definition : currentDefinition
}

/**
 * Active-reference-source selector (#837 / #849).
 *
 * Picks which saved source attributes the term definition, emitting
 * `definitionSource` / `definitionSourceUrl` as hidden inputs so the surrounding
 * <form> carries them through native FormData.
 *
 * The selection is conditionally controlled: when `selectedSource` /
 * `onSelectedSourceChange` are provided, the parent owns it — so a per-source
 * "Use as the term definition" action can set the definition text and select
 * that source as the active attribution together (#849). Otherwise the
 * component manages selection internally.
 *
 * Backward compatibility: a free-text `definitionSource` that doesn't match a
 * saved source is preserved under "Custom source". If a previously-selected
 * saved source is renamed or removed mid-edit, the prior attribution falls back
 * to Custom so nothing is lost.
 */
export function GlossarySourceSelect({
  sources,
  defaultSource = null,
  defaultSourceUrl = null,
  onChange,
  selectedSource,
  onSelectedSourceChange,
}: {
  sources: GlossarySourceOption[]
  defaultSource?: string | null
  defaultSourceUrl?: string | null
  onChange?: () => void
  selectedSource?: string
  onSelectedSourceChange?: (selection: string) => void
}) {
  const names = sources.map(s => s.name).filter(Boolean)
  const matchesSaved = !!defaultSource && names.includes(defaultSource)

  const controlled = selectedSource !== undefined
  const [internalSelection, setInternalSelection] = useState<string>(() => initialSourceSelection(defaultSource, names))
  const selection = controlled ? selectedSource! : internalSelection

  function setSelection(value: string) {
    if (!controlled) setInternalSelection(value)
    onSelectedSourceChange?.(value)
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {active?.definition && ' Its definition text has been used as the term definition above.'}
        </p>
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
