/**
 * Unit tests: dedupeById utility (#227)
 *
 * Pure function — no DB access required. Lives in the integration folder
 * because that is the only vitest suite configured for this package.
 */
import { describe, it, expect } from 'vitest'
import { dedupeById } from '@/lib/dedup'

describe('dedupeById', () => {
  it('returns an empty array unchanged', () => {
    expect(dedupeById([])).toEqual([])
  })

  it('returns a single-item array unchanged', () => {
    const items = [{ id: 'a', name: 'Alpha' }]
    expect(dedupeById(items)).toEqual(items)
  })

  it('removes exact duplicates — keeps first occurrence', () => {
    const items = [
      { id: 'a', name: 'First' },
      { id: 'b', name: 'Bravo' },
      { id: 'a', name: 'First again' },
    ]
    const result = dedupeById(items)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 'a', name: 'First' })
    expect(result[1]).toEqual({ id: 'b', name: 'Bravo' })
  })

  it('preserves insertion order', () => {
    const items = [
      { id: 'c', name: 'Charlie' },
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Bravo' },
      { id: 'a', name: 'Alpha dup' },
      { id: 'c', name: 'Charlie dup' },
    ]
    expect(dedupeById(items).map(i => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('handles a list where every item is a duplicate', () => {
    const items = [
      { id: 'x', value: 1 },
      { id: 'x', value: 2 },
      { id: 'x', value: 3 },
    ]
    const result = dedupeById(items)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1)
  })

  it('does not mutate the input array', () => {
    const items = [
      { id: 'a', name: 'Alpha' },
      { id: 'a', name: 'Alpha dup' },
    ]
    const copy = [...items]
    dedupeById(items)
    expect(items).toEqual(copy)
  })

  // ── Product rule: multi-path graph deduplication ───────────────────────────

  it('merges direct and capability-mediated app lists correctly (objective trace)', () => {
    // Simulates: Objective → direct → App X
    //            Objective → Capability → App X (same app, second path)
    //            Objective → Capability → App Y (new app)
    const directApps    = [{ id: 'app-x', name: 'Finance System' }]
    const viaCapability = [{ id: 'app-x', name: 'Finance System' }, { id: 'app-y', name: 'HR System' }]

    const merged = dedupeById([...directApps, ...viaCapability])

    expect(merged).toHaveLength(2)
    expect(merged.map(a => a.id)).toEqual(['app-x', 'app-y'])
  })

  it('works with arbitrary extra fields on the items', () => {
    const items = [
      { id: '1', name: 'Foo', vendor: 'Acme', lifecycleStatus: 'active' },
      { id: '2', name: 'Bar', vendor: 'Corp', lifecycleStatus: 'planned' },
      { id: '1', name: 'Foo', vendor: 'Acme', lifecycleStatus: 'active' },
    ]
    expect(dedupeById(items)).toHaveLength(2)
  })
})
