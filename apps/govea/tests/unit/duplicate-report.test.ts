/**
 * Unit tests for the same-org duplicate-candidate grouping (#718).
 *
 * Pure logic — no DB. Data assembly over real tables is covered by
 * tests/integration/duplicate-report.test.ts.
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeName,
  findDuplicateGroups,
  NEAR_THRESHOLD,
  type DuplicateRecord,
} from '@/lib/duplicate-report'

const rec = (id: string, name: string, extra: Partial<DuplicateRecord> = {}): DuplicateRecord =>
  ({ id, name, ...extra })

describe('normalizeName', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeName('Case-Management!')).toBe('case management')
    expect(normalizeName('  Case   Management ')).toBe('case management')
    expect(normalizeName('Permitting & Licensing')).toBe('permitting licensing')
    expect(normalizeName('CASE MANAGEMENT')).toBe('case management')
  })

  it('returns empty string for punctuation-only names', () => {
    expect(normalizeName('—')).toBe('')
    expect(normalizeName('')).toBe('')
  })
})

describe('findDuplicateGroups — exact tier', () => {
  it('groups case/punctuation/whitespace variants of the same name', () => {
    const groups = findDuplicateGroups([
      rec('a', 'Case Management'),
      rec('b', 'case-management'),
      rec('c', 'CASE  MANAGEMENT!'),
      rec('d', 'Permitting'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].tier).toBe('exact')
    expect(groups[0].similarity).toBe(1)
    expect(groups[0].records.map(r => r.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('returns no groups when all names are distinct', () => {
    expect(findDuplicateGroups([rec('a', 'Permits'), rec('b', 'Licensing')])).toEqual([])
  })

  it('exact matching ignores nearGroupKey — same name across domains still flags', () => {
    const groups = findDuplicateGroups([
      rec('a', 'Case Management', { nearGroupKey: 'health' }),
      rec('b', 'Case Management', { nearGroupKey: 'justice' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].tier).toBe('exact')
  })

  it('skips records whose names normalize to empty', () => {
    expect(findDuplicateGroups([rec('a', '—'), rec('b', '!!')])).toEqual([])
  })
})

describe('findDuplicateGroups — near tier', () => {
  it('groups names sharing most meaningful tokens', () => {
    // tokens: {online, permitting} vs {permitting, licensing} → 1/3 — below 0.5.
    // {online, permitting} vs {permitting, online, portal}: 2/3 ≥ 0.5 ✓
    const groups = findDuplicateGroups([
      rec('a', 'Online Permitting'),
      rec('b', 'Permitting Online Portal'),
      rec('c', 'Fleet Maintenance'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].tier).toBe('near')
    expect(groups[0].records.map(r => r.id).sort()).toEqual(['a', 'b'])
    expect(groups[0].similarity).toBeGreaterThanOrEqual(NEAR_THRESHOLD)
    expect(groups[0].similarity).toBeLessThan(1)
  })

  it('near comparison is scoped to nearGroupKey', () => {
    const groups = findDuplicateGroups([
      rec('a', 'Online Permitting', { nearGroupKey: 'health' }),
      rec('b', 'Permitting Online Portal', { nearGroupKey: 'justice' }),
    ])
    expect(groups).toEqual([])
  })

  it('records in an exact group are excluded from near comparison', () => {
    const groups = findDuplicateGroups([
      rec('a', 'Online Permitting'),
      rec('b', 'online permitting'),       // exact with a
      rec('c', 'Online Permitting Portal'), // near a/b — but they're consumed by exact
      rec('d', 'Fleet Maintenance'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].tier).toBe('exact')
    expect(groups[0].records.map(r => r.id).sort()).toEqual(['a', 'b'])
  })

  it('chains transitively: A~B and B~C land in one group', () => {
    const groups = findDuplicateGroups([
      rec('a', 'Permit Intake Review'),
      rec('b', 'Permit Intake Review Board'),   // ~a (3/4)
      rec('c', 'Permit Intake Review Board Appeals'), // ~b (4/5)
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].records).toHaveLength(3)
  })
})

describe('findDuplicateGroups — ordering and safety', () => {
  it('exact groups come before near groups', () => {
    const groups = findDuplicateGroups([
      rec('a', 'Records Retention'),
      rec('b', 'records retention'),
      rec('c', 'Online Permitting'),
      rec('d', 'Permitting Online Portal'),
    ])
    expect(groups.map(g => g.tier)).toEqual(['exact', 'near'])
  })

  it('does not mutate the input array', () => {
    const input = [rec('a', 'X Ray Services'), rec('b', 'x-ray services')]
    const copy = structuredClone(input)
    findDuplicateGroups(input)
    expect(input).toEqual(copy)
  })

  it('handles empty input', () => {
    expect(findDuplicateGroups([])).toEqual([])
  })
})
