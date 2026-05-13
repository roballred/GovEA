'use client'

import { useState, useTransition } from 'react'

interface OptionRow {
  id: string
  name: string
  subtitle?: string
}

interface PickerProps {
  label: string
  hint?: string
  options: OptionRow[]
  selected: string[]
  onChange: (next: string[]) => void
}

function MultiSelectPicker({ label, hint, options, selected, onChange }: PickerProps) {
  return (
    <details className="rounded-md border bg-card px-4 py-2" open={selected.length > 0}>
      <summary className="text-sm font-medium cursor-pointer">
        {label} <span className="text-muted-foreground font-normal">({selected.length} selected)</span>
      </summary>
      {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground italic mt-2">Nothing to link to yet.</p>
      ) : (
        <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
          {options.map(opt => (
            <label key={opt.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.includes(opt.id)}
                onChange={e => onChange(e.target.checked
                  ? [...selected, opt.id]
                  : selected.filter(id => id !== opt.id))}
              />
              <span>
                {opt.name}
                {opt.subtitle && (
                  <span className="block text-xs text-muted-foreground">{opt.subtitle}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </details>
  )
}

// ── Entity relationships form ───────────────────────────────────────────────
// "is related" (other entities) + "characterized by" (attributes).

export function EntityRelationshipsForm({
  entityName, entityId,
  otherEntities, allAttributes,
  initialRelatedEntityIds, initialCharacterizingAttributeIds,
  saveAction, successHref,
}: {
  entityName: string
  entityId: string
  otherEntities: OptionRow[]
  allAttributes: OptionRow[]
  initialRelatedEntityIds: string[]
  initialCharacterizingAttributeIds: string[]
  saveAction: (relatedEntityIds: string[], characterizingAttributeIds: string[]) => Promise<unknown>
  successHref?: string
}) {
  const [related, setRelated] = useState<string[]>(initialRelatedEntityIds)
  const [characterizing, setCharacterizing] = useState<string[]>(initialCharacterizingAttributeIds)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    startTransition(async () => {
      try {
        await saveAction(related, characterizing)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="entityId" value={entityId} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Related entities <span className="text-muted-foreground font-normal">— {'"is related"'}</span></h2>
        <MultiSelectPicker
          label="Entities related to this one"
          hint={`Mark which other entities ${entityName} is semantically related to. Undirected — appears in both directions.`}
          options={otherEntities}
          selected={related}
          onChange={setRelated}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Characterizing attributes <span className="text-muted-foreground font-normal">— {'"is characterized by"'}</span></h2>
        <MultiSelectPicker
          label="Attributes that characterize this entity"
          hint={`Attributes describe ${entityName}'s properties. In Data Vault terms these are the satellites attached to this hub.`}
          options={allAttributes}
          selected={characterizing}
          onChange={setCharacterizing}
        />
      </div>

      {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save relationships'}
        </button>
      </div>
    </form>
  )
}

// ── Attribute relationships form ────────────────────────────────────────────
// "shares" (other attributes).

export function AttributeRelationshipsForm({
  attributeName, attributeId,
  otherAttributes,
  initialSharedAttributeIds,
  saveAction, successHref,
}: {
  attributeName: string
  attributeId: string
  otherAttributes: OptionRow[]
  initialSharedAttributeIds: string[]
  saveAction: (sharedAttributeIds: string[]) => Promise<unknown>
  successHref?: string
}) {
  const [shared, setShared] = useState<string[]>(initialSharedAttributeIds)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    startTransition(async () => {
      try {
        await saveAction(shared)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="attributeId" value={attributeId} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Shared attributes <span className="text-muted-foreground font-normal">— {'"shares"'}</span></h2>
        <MultiSelectPicker
          label="Attributes this one shares definitions or values with"
          hint={`Mark attributes semantically equivalent to ${attributeName}. Undirected — appears symmetrically.`}
          options={otherAttributes}
          selected={shared}
          onChange={setShared}
        />
      </div>

      {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save relationships'}
        </button>
      </div>
    </form>
  )
}
