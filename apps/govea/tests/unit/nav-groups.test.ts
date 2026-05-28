/**
 * Unit tests for the single-open accordion nav-group state logic (#662).
 *
 * Pure logic — no React, no jsdom. Storage is exercised via an in-memory
 * shim so the test runs in any vitest environment.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  groupSlug,
  readOpenGroup,
  writeOpenGroup,
} from '@/lib/nav-groups'

// ── In-memory Storage shim ───────────────────────────────────────────────────

function makeStorage(): Storage {
  const map = new Map<string, string>()
  const storage: Storage = {
    get length() { return map.size },
    clear() { map.clear() },
    getItem(key) { return map.has(key) ? map.get(key)! : null },
    key(index) { return Array.from(map.keys())[index] ?? null },
    removeItem(key) { map.delete(key) },
    setItem(key, value) { map.set(key, String(value)) },
  }
  return storage
}

let storage: Storage
beforeEach(() => { storage = makeStorage() })

// ── groupSlug ────────────────────────────────────────────────────────────────

describe('groupSlug', () => {
  it('lowercases and replaces non-alphanumerics with single hyphens', () => {
    expect(groupSlug('Business Architecture')).toBe('business-architecture')
    expect(groupSlug('Data Architecture')).toBe('data-architecture')
    expect(groupSlug('Strategy')).toBe('strategy')
    expect(groupSlug('Reports & Insights')).toBe('reports-insights')
  })

  it('trims leading/trailing hyphens and collapses separators', () => {
    expect(groupSlug('  Spaced  ')).toBe('spaced')
    expect(groupSlug('!!Reports!!')).toBe('reports')
    expect(groupSlug('A & B / C')).toBe('a-b-c')
  })
})

// ── readOpenGroup ────────────────────────────────────────────────────────────

describe('readOpenGroup', () => {
  it('returns null when storage has no preference (default-all-collapsed)', () => {
    expect(readOpenGroup(storage)).toBeNull()
  })

  it('returns the stored group label', () => {
    storage.setItem('nav.openGroup', 'Strategy')
    expect(readOpenGroup(storage)).toBe('Strategy')
  })

  it('returns null when storage is unavailable (SSR)', () => {
    expect(readOpenGroup(null)).toBeNull()
    expect(readOpenGroup(undefined)).toBeNull()
  })

  it('returns null when the stored value is empty / whitespace', () => {
    storage.setItem('nav.openGroup', '')
    expect(readOpenGroup(storage)).toBeNull()
    storage.setItem('nav.openGroup', '   ')
    expect(readOpenGroup(storage)).toBeNull()
  })

  it('falls back to null if getItem throws', () => {
    const throwing: Pick<Storage, 'getItem'> = {
      getItem() { throw new Error('storage disabled') },
    }
    expect(readOpenGroup(throwing)).toBeNull()
  })

  it('ignores the legacy per-group keys from #479', () => {
    // #479 used per-group keys (nav.group.<slug>.open). The new shape
    // (#662) reads only nav.openGroup. Legacy keys are intentionally
    // ignored.
    storage.setItem('nav.group.business-architecture.open', '1')
    storage.setItem('nav.group.strategy.open', '1')
    expect(readOpenGroup(storage)).toBeNull()
  })
})

// ── writeOpenGroup ───────────────────────────────────────────────────────────

describe('writeOpenGroup', () => {
  it('writes the label to nav.openGroup', () => {
    writeOpenGroup('Strategy', storage)
    expect(storage.getItem('nav.openGroup')).toBe('Strategy')
  })

  it('removes the key when given null (clears the open group)', () => {
    storage.setItem('nav.openGroup', 'Strategy')
    writeOpenGroup(null, storage)
    expect(storage.getItem('nav.openGroup')).toBeNull()
  })

  it('removes the key when given empty string', () => {
    storage.setItem('nav.openGroup', 'Strategy')
    writeOpenGroup('', storage)
    expect(storage.getItem('nav.openGroup')).toBeNull()
  })

  it('overwrites a previously-stored label (only one open at a time)', () => {
    writeOpenGroup('Strategy', storage)
    writeOpenGroup('Reports', storage)
    expect(storage.getItem('nav.openGroup')).toBe('Reports')
  })

  it('is a no-op when storage is unavailable', () => {
    writeOpenGroup('Strategy', null)
    writeOpenGroup(null, undefined)
  })

  it('swallows setItem / removeItem errors', () => {
    const throwing = {
      setItem() { throw new Error('quota exceeded') },
      removeItem() { throw new Error('disabled') },
    } as Pick<Storage, 'setItem' | 'removeItem'>
    writeOpenGroup('Strategy', throwing)
    writeOpenGroup(null, throwing)
  })
})

// ── round-trip ───────────────────────────────────────────────────────────────

describe('round-trip read after write', () => {
  it('write then read returns the same label', () => {
    writeOpenGroup('Strategy', storage)
    expect(readOpenGroup(storage)).toBe('Strategy')
  })

  it('write null then read returns null', () => {
    writeOpenGroup('Strategy', storage)
    writeOpenGroup(null, storage)
    expect(readOpenGroup(storage)).toBeNull()
  })
})
