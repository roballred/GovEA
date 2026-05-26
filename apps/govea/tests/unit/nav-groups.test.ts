/**
 * Unit tests for the collapsible-nav-group state logic (#479).
 *
 * Pure logic — no React, no jsdom. Storage is exercised via an in-memory
 * shim so the test runs in any vitest environment.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  groupSlug,
  groupStorageKey,
  defaultGroupOpen,
  readGroupOpen,
  writeGroupOpen,
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

  it('trims leading and trailing hyphens', () => {
    expect(groupSlug('  Spaced  ')).toBe('spaced')
    expect(groupSlug('!!Reports!!')).toBe('reports')
  })

  it('collapses multiple separators into one', () => {
    expect(groupSlug('A & B / C')).toBe('a-b-c')
  })
})

// ── groupStorageKey ──────────────────────────────────────────────────────────

describe('groupStorageKey', () => {
  it('uses the documented nav.group.<slug>.open shape', () => {
    expect(groupStorageKey('Business Architecture')).toBe('nav.group.business-architecture.open')
    expect(groupStorageKey('Strategy')).toBe('nav.group.strategy.open')
  })
})

// ── defaultGroupOpen ─────────────────────────────────────────────────────────

describe('defaultGroupOpen', () => {
  it('returns true for the default-open groups in #479 scope', () => {
    expect(defaultGroupOpen('Business Architecture')).toBe(true)
    expect(defaultGroupOpen('Data Architecture')).toBe(true)
    expect(defaultGroupOpen('Portfolio')).toBe(true)
  })

  it('returns false for the default-collapsed groups in #479 scope', () => {
    expect(defaultGroupOpen('Strategy')).toBe(false)
    expect(defaultGroupOpen('Reports')).toBe(false)
    expect(defaultGroupOpen('Configuration')).toBe(false)
  })

  it('returns false for an unknown group (conservative default)', () => {
    expect(defaultGroupOpen('Some New Group')).toBe(false)
  })
})

// ── readGroupOpen ────────────────────────────────────────────────────────────

describe('readGroupOpen', () => {
  it('returns the default when the key is missing', () => {
    expect(readGroupOpen('Business Architecture', storage)).toBe(true)
    expect(readGroupOpen('Strategy', storage)).toBe(false)
  })

  it('returns true when the stored value is "1"', () => {
    storage.setItem('nav.group.strategy.open', '1')
    expect(readGroupOpen('Strategy', storage)).toBe(true)
  })

  it('returns false when the stored value is "0"', () => {
    storage.setItem('nav.group.business-architecture.open', '0')
    expect(readGroupOpen('Business Architecture', storage)).toBe(false)
  })

  it('falls back to the default for a malformed stored value', () => {
    storage.setItem('nav.group.strategy.open', 'true')
    expect(readGroupOpen('Strategy', storage)).toBe(false)
    storage.setItem('nav.group.business-architecture.open', 'yes')
    expect(readGroupOpen('Business Architecture', storage)).toBe(true)
  })

  it('returns the default when no storage is available (SSR)', () => {
    expect(readGroupOpen('Business Architecture', null)).toBe(true)
    expect(readGroupOpen('Strategy', undefined)).toBe(false)
  })

  it('falls back to the default if getItem throws', () => {
    const throwing: Pick<Storage, 'getItem'> = {
      getItem() { throw new Error('storage disabled') },
    }
    expect(readGroupOpen('Business Architecture', throwing)).toBe(true)
    expect(readGroupOpen('Strategy', throwing)).toBe(false)
  })
})

// ── writeGroupOpen ───────────────────────────────────────────────────────────

describe('writeGroupOpen', () => {
  it('writes "1" for open and "0" for closed under the documented key', () => {
    writeGroupOpen('Strategy', true, storage)
    expect(storage.getItem('nav.group.strategy.open')).toBe('1')
    writeGroupOpen('Strategy', false, storage)
    expect(storage.getItem('nav.group.strategy.open')).toBe('0')
  })

  it('is a no-op when storage is unavailable (SSR / private mode)', () => {
    // Should not throw.
    writeGroupOpen('Strategy', true, null)
    writeGroupOpen('Strategy', false, undefined)
  })

  it('swallows setItem errors so the UI keeps working', () => {
    const throwing: Pick<Storage, 'setItem'> = {
      setItem() { throw new Error('quota exceeded') },
    }
    // Should not throw.
    writeGroupOpen('Strategy', true, throwing)
  })
})

// ── round-trip ───────────────────────────────────────────────────────────────

describe('round-trip read after write', () => {
  it('write then read returns the same value', () => {
    writeGroupOpen('Strategy', true, storage)
    expect(readGroupOpen('Strategy', storage)).toBe(true)
    writeGroupOpen('Strategy', false, storage)
    expect(readGroupOpen('Strategy', storage)).toBe(false)
  })

  it('does not leak across groups', () => {
    writeGroupOpen('Strategy', true, storage)
    expect(readGroupOpen('Reports', storage)).toBe(false) // still its default
  })
})
