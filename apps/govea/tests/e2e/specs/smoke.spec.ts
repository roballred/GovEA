/**
 * Smoke tests — server health only.
 *
 * Single goal: confirm the app started and key routes return a healthy page
 * (no 500, no unhandled exception) for a logged-in admin.
 *
 * This is intentionally narrow. Role/permission logic lives in iam.spec.ts.
 * Detail-page rendering is covered by the TypeScript type-check and build.
 */

import { test, expect, type Page } from '@playwright/test'

const ROUTES = [
  '/dashboard',
  '/overview',   // #614 — stakeholder landing, all roles
  '/capabilities',
  '/applications',
  '/adrs',
  '/personas',
  '/users',        // admin-only — confirms RBAC gate doesn't crash
  '/traceability', // #695 — hub view; detail pages across the app link into it
] as const

async function expectNoServerError(page: Page, route: string) {
  await expect(
    page.getByText('Application error: a client-side exception has occurred'),
    `${route}: should not show a client-side exception`,
  ).not.toBeVisible()

  await expect(
    page.getByText('An error occurred in the Server Components render'),
    `${route}: should not show a Server Component render error`,
  ).not.toBeVisible()

  const title = await page.title()
  expect(title, `${route}: page title should not contain "500"`).not.toMatch(/500/i)
}

test.use({ storageState: 'tests/e2e/.auth/admin.json' })

for (const route of ROUTES) {
  test(`${route} → 200, no server error`, async ({ page }) => {
    const response = await page.goto(route)
    expect(
      response?.status(),
      `${route}: HTTP status should be < 500`,
    ).toBeLessThan(500)
    await expectNoServerError(page, route)
    expect(page.url(), `${route}: should not redirect to /login`).not.toContain('/login')
  })
}

// #739 — baseline security response headers are present.
test('security response headers are set', async ({ page }) => {
  const response = await page.goto('/overview')
  const headers = response?.headers() ?? {}
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['strict-transport-security']).toContain('max-age=')
  expect(
    headers['content-security-policy-report-only'],
    'CSP should ship report-only first (see next.config.ts)',
  ).toContain("frame-ancestors 'none'")
})
