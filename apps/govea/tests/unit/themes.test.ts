/**
 * Unit tests for theme utilities (#118)
 *
 * getTheme         — look up a theme by id with fallback
 * themeToStyleString — serialises a ThemeDefinition to inline CSS
 */

import { describe, it, expect } from 'vitest'
import { getTheme, themeToStyleString, themes } from '@/lib/themes'

// ---------------------------------------------------------------------------
// getTheme
// ---------------------------------------------------------------------------

describe('getTheme', () => {
  it('returns the govea theme by id', () => {
    expect(getTheme('govea').id).toBe('govea')
  })

  it('returns the servicenow theme by id', () => {
    expect(getTheme('servicenow').id).toBe('servicenow')
  })

  it('falls back to the first theme for an unknown id', () => {
    const fallback = getTheme('unknown-theme-id')
    expect(fallback.id).toBe(themes[0].id)
  })

  it('returned theme has required shape', () => {
    const t = getTheme('govea')
    expect(t).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      vars: expect.any(Object),
      previewColors: {
        header: expect.any(String),
        primary: expect.any(String),
        background: expect.any(String),
      },
    })
  })
})

// ---------------------------------------------------------------------------
// themeToStyleString
// ---------------------------------------------------------------------------

describe('themeToStyleString', () => {
  const govea = getTheme('govea')
  const css = themeToStyleString(govea)

  it('produces a non-empty string', () => {
    expect(css.length).toBeGreaterThan(0)
  })

  it('contains a :root block for brand vars (always-on)', () => {
    expect(css).toMatch(/:root\s*\{/)
  })

  it('contains a :root:not(.dark) block for content vars', () => {
    expect(css).toMatch(/:root:not\(\.dark\)\s*\{/)
  })

  it('places header-bg in the unconditional :root block', () => {
    // Split on the :root:not(.dark) boundary
    const rootBlock = css.split(':root:not(.dark)')[0]
    expect(rootBlock).toContain('--header-bg')
  })

  it('places --background in the :root:not(.dark) block only', () => {
    // Uses servicenow: govea no longer declares content vars (#772).
    const snCss = themeToStyleString(getTheme('servicenow'))
    const [rootBlock, darkBlock] = snCss.split(':root:not(.dark)')
    expect(rootBlock).not.toContain('--background')
    expect(darkBlock).toContain('--background')
  })

  it('does not put brand vars inside :root:not(.dark)', () => {
    const notDarkBlock = css.split(':root:not(.dark)')[1] ?? ''
    expect(notDarkBlock).not.toContain('--header-bg')
    expect(notDarkBlock).not.toContain('--header-fg')
    expect(notDarkBlock).not.toContain('--header-border')
  })

  it('works for the servicenow theme too', () => {
    const sn = getTheme('servicenow')
    const snCss = themeToStyleString(sn)
    expect(snCss).toContain('--header-bg')
    expect(snCss).toContain(':root:not(.dark)')
  })

  it('every var in the theme appears somewhere in the output', () => {
    for (const key of Object.keys(govea.vars)) {
      expect(css).toContain(key)
    }
  })
})

// ---------------------------------------------------------------------------
// theme definitions
// ---------------------------------------------------------------------------

describe('theme definitions', () => {
  it('govea (the default brand) declares only the header/brand vars (#772)', () => {
    // Everything else must cascade from globals.css — see the vars contract
    // in themes.ts and tests/unit/theme-globals-sync.test.ts.
    expect(Object.keys(getTheme('govea').vars).sort()).toEqual([
      '--header-bg',
      '--header-border',
      '--header-fg',
    ])
  })

  it('no theme re-declares --destructive (cascades from globals.css)', () => {
    for (const theme of themes) {
      expect(theme.vars).not.toHaveProperty('--destructive')
    }
  })
})
