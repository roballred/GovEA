/**
 * Drift guard: org themes vs globals.css base tokens (#771)
 *
 * Org theme vars from themes.ts are injected as an inline :root <style> by
 * app-shell.tsx, so they win the cascade over the :root block in globals.css
 * at runtime. During WCAG AA work (#766 / #770) a contrast fix to
 * --destructive in globals.css was silently negated by stale copies in
 * themes.ts.
 *
 * For accessibility-critical vars, a theme must either omit the var (letting
 * globals.css cascade through) or define exactly the globals.css value.
 * An intentional deviation needs its own contrast review — change globals.css
 * first, or consciously amend ACCESSIBILITY_CRITICAL_VARS in the same PR.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { themes } from '@/lib/themes'

// Tokens whose values have been contrast-reviewed in globals.css. Extend as
// more tokens get an accessibility pass.
const ACCESSIBILITY_CRITICAL_VARS = ['--destructive']

const globalsPath = fileURLToPath(new URL('../../src/app/globals.css', import.meta.url))

/** Extract the custom properties declared in the (single) :root block. */
function parseRootVars(css: string): Record<string, string> {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rootBlock = noComments.match(/:root\s*\{([^}]*)\}/)
  if (!rootBlock) throw new Error('Could not find a :root block in globals.css')
  const vars: Record<string, string> = {}
  for (const decl of rootBlock[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[decl[1]] = decl[2].trim()
  }
  return vars
}

const rootVars = parseRootVars(readFileSync(globalsPath, 'utf-8'))

describe('theme drift guard (themes.ts vs globals.css)', () => {
  it('parses custom properties out of the globals.css :root block', () => {
    expect(Object.keys(rootVars).length).toBeGreaterThan(0)
  })

  // Parser-rot guard: if globals.css is restructured (var renamed, :root
  // split up) this fails before the omit-or-match assertions go vacuous.
  it.each(ACCESSIBILITY_CRITICAL_VARS)('globals.css :root defines %s', varName => {
    expect(
      rootVars[varName],
      `${varName} not found in the :root block of globals.css — renamed or moved? ` +
        'Update ACCESSIBILITY_CRITICAL_VARS in this test to follow it.',
    ).toBeDefined()
  })

  describe.each(themes.map(t => [t.id, t] as const))('theme "%s"', (_id, theme) => {
    it.each(ACCESSIBILITY_CRITICAL_VARS)('omits %s or matches the globals.css value', varName => {
      const themeValue = theme.vars[varName]
      if (themeValue === undefined) return // omitted — globals.css cascades through

      expect(
        themeValue,
        `Theme "${theme.id}" overrides ${varName} with a value that differs from ` +
          'globals.css. The inline theme style wins the cascade, so this silently ' +
          'negates the contrast-reviewed value (see #766/#770). Sync it with ' +
          'globals.css, or remove it from the theme so the base value applies.',
      ).toBe(rootVars[varName])
    })
  })
})
