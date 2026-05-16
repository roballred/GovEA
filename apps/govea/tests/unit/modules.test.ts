/**
 * Unit tests for module toggle utilities (#118)
 *
 * isModuleEnabled — absent key defaults to true (opt-out semantics)
 * moduleForPath  — maps a pathname to its owning ModuleDef
 */

import { describe, it, expect } from 'vitest'
import { MODULE_DEFS, isModuleEnabled, moduleForPath } from '@/lib/modules'

// ---------------------------------------------------------------------------
// isModuleEnabled
// ---------------------------------------------------------------------------

describe('isModuleEnabled', () => {
  it('returns true when key is absent (new modules default on)', () => {
    expect(isModuleEnabled({}, 'personas')).toBe(true)
  })

  it('returns true when key is explicitly true', () => {
    expect(isModuleEnabled({ personas: true }, 'personas')).toBe(true)
  })

  it('returns false when key is explicitly false', () => {
    expect(isModuleEnabled({ personas: false }, 'personas')).toBe(false)
  })

  it('does not leak — other keys do not affect the queried key', () => {
    const map = { capabilities: false, roadmap: false }
    expect(isModuleEnabled(map, 'personas')).toBe(true)
  })

  it('handles all module keys consistently', () => {
    const allOff = {
      personas: false,
      'value-streams': false,
      capabilities: false,
      services: false,
      glossary: false,
      applications: false,
      adrs: false,
      principles: false,
      objectives: false,
      initiatives: false,
      roadmap: false,
      debt: false,
      'data-architecture': false,
      'framework-overlay': false,
    }
    expect(isModuleEnabled(allOff, 'roadmap')).toBe(false)
    expect(isModuleEnabled({}, 'roadmap')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// moduleForPath
// ---------------------------------------------------------------------------

describe('moduleForPath', () => {
  it('returns the correct def for an exact route match', () => {
    const mod = moduleForPath('/personas')
    expect(mod?.key).toBe('personas')
  })

  it('returns the correct def for a sub-path', () => {
    const mod = moduleForPath('/personas/abc-123')
    expect(mod?.key).toBe('personas')
  })

  it('returns the correct def for a deeply nested sub-path', () => {
    const mod = moduleForPath('/capabilities/abc/edit')
    expect(mod?.key).toBe('capabilities')
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

  it('matches roadmap', () => {
    expect(moduleForPath('/roadmap')).toMatchObject({ key: 'roadmap' })
  })

  it('matches data architecture to its own module group', () => {
    expect(moduleForPath('/data/entities')).toMatchObject({
      key: 'data-architecture',
      group: 'Data Architecture',
    })
  })

  it('keeps data architecture out of the portfolio module group', () => {
    const portfolioKeys = MODULE_DEFS.filter(def => def.group === 'Portfolio').map(def => def.key)
    expect(portfolioKeys).toEqual(['applications', 'adrs', 'debt'])
    expect(MODULE_DEFS.find(def => def.key === 'data-architecture')).toMatchObject({
      group: 'Data Architecture',
    })
  })

  it('returns the full ModuleDef shape', () => {
    const mod = moduleForPath('/adrs')
    expect(mod).toMatchObject({
      key: 'adrs',
      label: expect.any(String),
      href: '/adrs',
      group: 'Portfolio',
    })
  })
})
