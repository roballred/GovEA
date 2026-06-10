'use client'

import type { EntityTaxonomyValue, TaxonomyTerm } from '@/db/schema'
import { Label } from '@/components/ui/label'

// Shared type used by all entity list pages that support taxonomy
export type EnrichedTaxonomyDefinition = {
  id: string
  entityType: string
  taxonomyTypeId: string
  selectionMode: string
  required: boolean
  sortOrder: number
  typeName: string
  typeSlug: string
  values: TaxonomyTerm[]
}

const SELECT_CLASS = 'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ---------------------------------------------------------------------------
// TaxonomyInputs — form fields for taxonomy selection in create/edit dialogs
// ---------------------------------------------------------------------------

export function TaxonomyInputs({
  defs,
  currentValues,
}: {
  defs: EnrichedTaxonomyDefinition[]
  currentValues: EntityTaxonomyValue[]
}) {
  if (defs.length === 0) return null
  const currentTermIds = new Set(currentValues.map(v => v.taxonomyTermId))

  return (
    <>
      {defs.map(def => (
        <div key={def.id} className="space-y-1.5">
          <Label>
            {def.typeName}
            {def.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {def.selectionMode === 'multi' ? (
            <div className="rounded-md border border-input bg-transparent px-3 py-2 max-h-36 overflow-y-auto space-y-1">
              {def.values.length === 0
                ? <p className="text-sm text-muted-foreground">No values defined yet.</p>
                : def.values.map(v => (
                  <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name="taxonomyTermIds"
                      value={v.id}
                      defaultChecked={currentTermIds.has(v.id)}
                      className="rounded"
                    />
                    {v.name}
                  </label>
                ))
              }
            </div>
          ) : (
            <select
              name="taxonomyTermIds"
              defaultValue={def.values.find(v => currentTermIds.has(v.id))?.id ?? ''}
              required={def.required}
              className={`${SELECT_CLASS} w-full`}
            >
              {!def.required && <option value="">— None —</option>}
              {def.values.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// TaxonomyFilters — filter selects for taxonomy in list toolbars
// ---------------------------------------------------------------------------

export function TaxonomyFilters({
  defs,
  filters,
  onFilterChange,
}: {
  defs: EnrichedTaxonomyDefinition[]
  filters: Record<string, string>
  onFilterChange: (defId: string, value: string) => void
}) {
  return (
    <>
      {defs.map(def => def.values.length > 0 && (
        <select
          key={def.id}
          aria-label={`Filter by ${def.typeName}`}
          value={filters[def.id] ?? 'all'}
          onChange={e => onFilterChange(def.id, e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">All {def.typeName}</option>
          {def.values.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// TaxonomyChips — selected taxonomy values displayed on detail pages
// ---------------------------------------------------------------------------

export function TaxonomyChips({
  definitions,
  selectedTermIds,
}: {
  definitions: EnrichedTaxonomyDefinition[]
  selectedTermIds: string[]
}) {
  if (definitions.length === 0) return null
  const termIdSet = new Set(selectedTermIds)
  const hasAny = definitions.some(def => def.values.some(v => termIdSet.has(v.id)))
  if (!hasAny) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {definitions.map(def => {
        const selected = def.values.filter(v => termIdSet.has(v.id))
        if (selected.length === 0) return null
        return (
          <div key={def.id} className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{def.typeName}:</span>
            <div className="flex flex-wrap gap-1">
              {selected.map(v => (
                <span
                  key={v.id}
                  className="inline-flex items-center rounded-full border bg-violet-50 text-violet-700 border-violet-200 px-2 py-0.5 text-xs font-medium"
                >
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
