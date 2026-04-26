/**
 * Unit tests for module toggle utilities (#118)
 *
 * isModuleEnabled — absent key behaviour depends on defaultOn:
 *   standard modules (defaultOn: true)  — absent → ON
 *   opt-in overlays  (defaultOn: false) — absent → OFF  ← TOGAF
 * moduleForPath — maps a pathname to its owning ModuleDef;
 *   modules with href: null (framework-overlay) never match any path
 */

import { describe, it, expect } from 'vitest'
import { isModuleEnabled, moduleForPath } from '@/lib/modules'

// ---------------------------------------------------------------------------
// isModuleEnabled — standard modules (defaultOn: true)
// ---------------------------------------------------------------------------

describe('isModuleEnabled — standard modules (default ON)', () => {
  it('returns true when key is absent', () => {
    expect(isModuleEnabled({}, 'personas')).toBe(true)
  })

  it('returns true when key is explicitly true', () => {
    expect(isModuleEnabled({ personas: true }, 'personas')).toBe(true)
  })

  it('returns false when key is explicitly false', () => {
    expect(isModuleEnabled({ personas: false }, 'personas')).toBe(false)
  })

  it('does not leak — other disabled keys do not affect the queried key', () => {
    const map = { capabilities: false, roadmap: false }
    expect(isModuleEnabled(map, 'personas')).toBe(true)
  })

  it('handles all standard module keys as default-on', () => {
    const keys = [
      'personas', 'value-streams', 'capabilities', 'services', 'glossary',
      'applications', 'adrs', 'principles', 'objectives', 'initiatives', 'roadmap',
    ] as const
    for (const key of keys) {
      expect(isModuleEnabled({}, key), `${key} absent → true`).toBe(true)
      expect(isModuleEnabled({ [key]: false }, key), `${key} false → false`).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// isModuleEnabled — opt-in overlays (defaultOn: false) — TOGAF
// ---------------------------------------------------------------------------

describe('isModuleEnabled — framework-overlay (default OFF)', () => {
  it('returns false when key is absent (opt-in modules default to OFF)', () => {
    expect(isModuleEnabled({}, 'framework-overlay')).toBe(false)
  })

  it('returns true when key is explicitly true (org opted in)', () => {
    expect(isModuleEnabled({ 'framework-overlay': true }, 'framework-overlay')).toBe(true)
  })

  it('returns false when key is explicitly false', () => {
    expect(isModuleEnabled({ 'framework-overlay': false }, 'framework-overlay')).toBe(false)
  })

  it('enabling framework-overlay does not affect standard modules', () => {
    const map = { 'framework-overlay': true }
    expect(isModuleEnabled(map, 'personas')).toBe(true)
    expect(isModuleEnabled(map, 'applications')).toBe(true)
  })

  it('disabling a standard module does not enable framework-overlay', () => {
    const map = { personas: false }
    expect(isModuleEnabled(map, 'framework-overlay')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// moduleForPath
// ---------------------------------------------------------------------------

describe('moduleForPath', () => {
  it('returns the correct def for an exact route match', () => {
    expect(moduleForPath('/personas')?.key).toBe('personas')
  })

  it('returns the correct def for a sub-path', () => {
    expect(moduleForPath('/personas/abc-123')?.key).toBe('personas')
  })

  it('returns the correct def for a deeply nested sub-path', () => {
    expect(moduleForPath('/capabilities/abc/edit')?.key).toBe('capabilities')
  })

  it('returns undefined for an unregistered path', () => {
    expect(moduleForPath('/dashboard')).toBeUndefined()
  })

  it('returns undefined for an empty path', () => {
    expect(moduleForPath('')).toBeUndefined()
  })

  it('does not match on partial prefix — /adr does not match /adrs', () => {
    expect(moduleForPath('/adr')).toBeUndefined()
  })

  it('does not match /application against /applications', () => {
    expect(moduleForPath('/application')).toBeUndefined()
  })

  it('matches value-streams correctly', () => {
    expect(moduleForPath('/value-streams')).toMatchObject({ key: 'value-streams' })
    expect(moduleForPath('/value-streams/stage/99')).toMatchObject({ key: 'value-streams' })
  })

  it('returns the full ModuleDef shape', () => {
    expect(moduleForPath('/adrs')).toMatchObject({
      key: 'adrs',
      label: expect.any(String),
      href: '/adrs',
      group: 'Portfolio',
    })
  })

  // framework-overlay has href: null — it should never claim a path
  it('framework-overlay does not match any path (href is null)', () => {
    expect(moduleForPath('/reports/togaf/application-landscape')).toBeUndefined()
    expect(moduleForPath('/reports/togaf')).toBeUndefined()
    expect(moduleForPath('/framework-overlay')).toBeUndefined()
  })
})
