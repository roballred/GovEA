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
  // #874 — authoring/config surfaces the original set never covered. Only the
  // ones that currently pass the serious/critical gate live here; surfaces with
  // known violations are quarantined in KNOWN_A11Y_GAPS below.
  '/data',
  // #862 — contrast fixed; /taxonomy now passes the gate.
  '/taxonomy',
] as const

// #874 — authoring surfaces with KNOWN serious/critical violations, captured by
// an axe run on 2026-06-19 (default `govea` theme). Quarantined with
// `test.fixme` so the suite stays green and the gap is tracked in code; remove
// the `test.fixme(...)` line for a route once its linked issue is fixed and the
// scan passes.
const KNOWN_A11Y_GAPS: { route: string; rules: string; issues: string }[] = [
  { route: '/glossary',      rules: 'select-name',         issues: '#867' },
  { route: '/value-streams', rules: 'select-name',         issues: '#867' },
  // #862 contrast fixed here; the remaining gaps are unlabeled selects/forms.
  { route: '/settings',      rules: 'select-name, label',  issues: '#867, #871' },
]

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

  // Quarantined surfaces (#874). These run the same scan but are marked fixme so
  // a known failure doesn't block CI; the annotation records the rule + issue.
  for (const gap of KNOWN_A11Y_GAPS) {
    test(`${gap.route} has no serious/critical WCAG violations`, async ({ page }) => {
      test.fixme(true, `Known a11y gap (${gap.rules}) — tracked in ${gap.issues}. Remove this line when fixed.`)
      await page.goto(gap.route)
      await page.waitForLoadState('networkidle')
      await runAxe(page, gap.route)
    })
  }
})

// #874 — DOM states that never appear in a static page load: an open modal
// dialog and an open edit form. axe only checks what is rendered, so these
// surfaces (and the controls inside them) are invisible to the route scans.
test.describe('accessibility — interactive states', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })

  test('glossary "New term" dialog has no serious/critical WCAG violations', async ({ page }) => {
    // #862 — the dialog's color-contrast gap is fixed; this scan now gates.
    await page.goto('/glossary')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '+ New Glossary Term' }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await runAxe(page, '/glossary [new-term dialog]')
  })

  test('value-stream edit form has no serious/critical WCAG violations', async ({ page }) => {
    // #874 — known gap: label + select-name on the edit form (#867, #871). Remove when fixed.
    test.fixme(true, 'Known a11y gaps (label, select-name) — tracked in #867, #871. Remove when fixed.')
    await page.goto('/value-streams')
    await page.waitForLoadState('networkidle')
    // Open the first value stream's detail, then its edit form (stage manager,
    // status/visibility selects, relationship panels live here).
    await page.locator('a[href^="/value-streams/"]').first().click()
    await page.waitForURL(/\/value-streams\/[^/]+$/)
    await page.getByRole('link', { name: 'Edit value stream' }).click()
    await page.waitForURL(/\/value-streams\/[^/]+\/edit$/)
    await page.waitForLoadState('networkidle')
    await runAxe(page, '/value-streams/[id]/edit')
  })
})

// #898 — the mobile nav drawer is `lg:hidden`, so at this suite's Desktop
// Chrome viewport it is `display: none` and axe skips it entirely. Every scan
// above is therefore blind to it: the drawer chrome adopted from
// @govcore/nextkit shipped with *no* real-browser contrast coverage until this
// test existed. Scanning it needs both a mobile viewport and the drawer opened
// — the same reason the dialog/edit-form states above are scanned separately.
test.describe('accessibility — mobile nav drawer', () => {
  test.use({
    storageState: 'tests/e2e/.auth/admin.json',
    viewport: { width: 390, height: 844 },
  })

  test('open mobile nav drawer has no serious/critical WCAG violations', async ({ page }) => {
    // The first-sign-in modal (first-sign-in-modal.tsx) auto-opens on a fresh
    // seed and is `aria-modal="true"`, which drops everything outside it out of
    // the accessibility tree — the drawer included, so no role query can reach
    // it. Dismiss it up front through the same localStorage key the component
    // reads, rather than depending on its button copy.
    await page.addInitScript(() => {
      window.localStorage.setItem('govea-first-sign-in-dismissed', new Date().toISOString())
    })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('dialog', { name: 'Primary (mobile)' }).waitFor({ state: 'visible' })
    await runAxe(page, '/dashboard [mobile nav drawer]')
  })
})
