/**
 * Automated accessibility checks — #766 (WCAG 2.1 AA, Washington Policy 188).
 *
 * Runs axe-core against the key authenticated routes (the smoke-test set)
 * plus the login page, scoped to the WCAG 2.0/2.1 A and AA rule tags.
 *
 * Gate policy: serious and critical violations fail the build. Moderate and
 * minor violations are logged to the test output for triage but do not fail —
 * tighten this once the backlog is clear. Waivers belong here, as rule
 * exclusions with a comment, not as silent config.
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const AUTHED_ROUTES = [
  '/dashboard',
  '/overview',
  '/capabilities',
  '/applications',
  '/adrs',
  '/personas',
  '/users',
] as const

async function runAxe(page: import('@playwright/test').Page, route: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

  const blocking = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical',
  )
  const advisory = results.violations.filter(
    v => v.impact !== 'serious' && v.impact !== 'critical',
  )

  for (const v of advisory) {
    console.log(
      `[a11y advisory] ${route}: ${v.id} (${v.impact}) — ${v.help} — ${v.nodes.length} node(s)`,
    )
  }

  expect(
    blocking.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map(n => n.target.join(' ')).slice(0, 5),
    })),
    `${route}: no serious/critical WCAG A/AA violations`,
  ).toEqual([])
}

test.describe('accessibility — login', () => {
  test('login page has no serious/critical WCAG violations', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await runAxe(page, '/login')
  })
})

test.describe('accessibility — authenticated routes', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })

  for (const route of AUTHED_ROUTES) {
    test(`${route} has no serious/critical WCAG violations`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await runAxe(page, route)
    })
  }
})
