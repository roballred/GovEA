/**
 * Style-tag breakout guard for org theme values (#769).
 *
 * themeToStyleString output is injected as an inline <style> via
 * dangerouslySetInnerHTML in app-shell.tsx, with no HTML escaping. Every
 * emitted declaration must therefore match a conservative allowlist
 * (isSafeThemeVar) that structurally excludes '<', ';', braces, quotes, and
 * backslashes — making a '</style><script>' breakout impossible even if a
 * theme value ever arrives from an untrusted source (custom org branding is
 * future fd-theming work).
 */

import { describe, it, expect } from 'vitest'
import { isSafeThemeVar, themeToStyleString, themes, type ThemeDefinition } from '@/lib/themes'

describe('isSafeThemeVar — accepted shapes', () => {
  it.each([
    ['221 83% 40%', 'shadcn HSL triple'],
    ['0 0% 100%', 'HSL triple with zero hue'],
    ['222.5 47% 11.2%', 'HSL triple with decimals'],
    ['0.375rem', 'rem length'],
    ['2px', 'px length'],
    ['50%', 'percentage'],
    ['#1a4fba', '6-digit hex'],
    ['#fff', '3-digit hex'],
    ['#1a4fba80', '8-digit hex'],
    ['rgb(26, 79, 186)', 'legacy rgb()'],
    ['hsl(221 83% 40% / 50%)', 'modern hsl() with alpha'],
    ['transparent', 'named keyword'],
  ])('accepts %s (%s)', value => {
    expect(isSafeThemeVar('--primary', value)).toBe(true)
  })
})

describe('isSafeThemeVar — rejected shapes', () => {
  it.each([
    ['</style><script>alert(1)</script>', 'style-tag breakout'],
    ['red; } body { display: none', 'declaration/block injection'],
    ['url(javascript:alert(1))', 'url() function'],
    ['expression(alert(1))', 'IE expression()'],
    ['221 83% 40%; --x: y', 'semicolon smuggling'],
    ['"red"', 'quotes'],
    ["'red'", 'single quotes'],
    ['red\\0', 'backslash escape'],
    ['221 83% 40%\n}', 'newline + brace'],
    ['rgb(<img>)', 'angle bracket inside function args'],
    [`#${'f'.repeat(120)}`, 'over-length value'],
    ['', 'empty value'],
  ])('rejects %s (%s)', value => {
    expect(isSafeThemeVar('--primary', value)).toBe(false)
  })

  it.each([
    ['--x</style>', 'breakout in the name'],
    ['--UPPER', 'uppercase name'],
    ['color', 'non-custom-property name'],
    ['--', 'empty custom property'],
  ])('rejects unsafe name %s (%s)', name => {
    expect(isSafeThemeVar(name, '221 83% 40%')).toBe(false)
  })
})

describe('themeToStyleString — strips unsafe vars instead of emitting them', () => {
  const malicious: ThemeDefinition = {
    id: 'govea',
    name: 'Evil',
    description: '',
    darkMode: false,
    previewColors: { header: '#000', primary: '#000', background: '#fff' },
    vars: {
      '--primary': '221 83% 40%', // legitimate — must survive
      '--header-bg': '</style><script>alert(1)</script>',
      '--x</style>': '0 0% 100%',
      '--ring': 'red; } body { display: none',
    },
  }

  it('emits no markup-significant characters and keeps the safe var', () => {
    const css = themeToStyleString(malicious)
    expect(css).not.toContain('<')
    expect(css).not.toContain('script')
    expect(css).not.toContain('display: none')
    expect(css).toContain('--primary: 221 83% 40%')
  })
})

describe('shipped themes — every var passes the allowlist', () => {
  // Drift guard: if a legitimate brand value is added that the allowlist
  // rejects, it would be silently stripped at render time. Fail here instead
  // so the allowlist is consciously extended in the same PR.
  for (const theme of themes) {
    it(`theme "${theme.id}" emits all of its vars`, () => {
      for (const [name, value] of Object.entries(theme.vars)) {
        expect(isSafeThemeVar(name, value), `${name}: ${value} should be allowlisted`).toBe(true)
      }
    })
  }
})
