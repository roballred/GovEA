/**
 * Route × role smoke tests.
 *
 * Verifies that every main route returns a healthy page (no 500, no unhandled
 * exception) for each of the four dev roles.  Tests use pre-built storageState
 * files created by global-setup.ts so no UI login is needed per test.
 *
 * What "healthy" means here:
 *   - HTTP response status < 500
 *   - Page does not contain Next.js error-boundary or server-component error text
 *   - For admin-only routes, non-admin users are redirected to /dashboard
 *     (a clean 302 is healthy — we distinguish it from an error 500)
 *
 * Requires a seeded database (DEV=true pnpm db:seed).
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Route inventory ──────────────────────────────────────────────────────────

/** Routes every authenticated user can reach (no role gate). */
const ALL_ROLES_ROUTES = [
  '/dashboard',
  '/personas',
  '/capabilities',
  '/applications',
  '/adrs',
  '/initiatives',
  '/objectives',
  '/value-streams',
  '/roadmap',
  '/taxonomy',
  '/settings',
] as const

/**
 * Routes where non-admin users are redirected to /dashboard.
 * A redirect is healthy; a 500 is not.
 */
const ADMIN_ONLY_ROUTES = ['/users', '/connections', '/audit'] as const

/**
 * Dynamic [id] routes tested by navigating from the list page.
 * We follow the first detail-page link found on the list; if none exist the
 * test is skipped (seed data should always populate these).
 */
const DYNAMIC_ROUTES = [
  { list: '/value-streams', hrefPrefix: '/value-streams/' },
  { list: '/initiatives',   hrefPrefix: '/initiatives/'   },
  { list: '/objectives',    hrefPrefix: '/objectives/'    },
] as const

// ─── Role fixtures ────────────────────────────────────────────────────────────

// Paths are relative to the playwright.config.ts location (apps/govea/).
const ROLES = [
  { name: 'admin',       storageState: 'tests/e2e/.auth/admin.json'       },
  { name: 'contributor', storageState: 'tests/e2e/.auth/contributor.json' },
  { name: 'viewer',      storageState: 'tests/e2e/.auth/viewer.json'      },
  { name: 'state-admin', storageState: 'tests/e2e/.auth/state-admin.json' },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert the page is not showing a Next.js error boundary or server-component
 * crash.  We check both the known error-page strings and the page title.
 */
async function expectNoServerError(page: Page, route: string) {
  // Next.js App Router renders one of these strings when a RSC or boundary
  // throws an unhandled exception.
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

// ─── Test matrix ─────────────────────────────────────────────────────────────

for (const { name: role, storageState } of ROLES) {
  test.describe(`[${role}]`, () => {
    test.use({ storageState })

    // ── Routes accessible to all authenticated users ──────────────────────

    for (const route of ALL_ROLES_ROUTES) {
      test(`${route} → 200, no server error`, async ({ page }) => {
        const response = await page.goto(route)
        expect(
          response?.status(),
          `${route}: HTTP status should be < 500`,
        ).toBeLessThan(500)
        await expectNoServerError(page, route)
        // Should stay on the intended route (not bounced to login)
        expect(page.url(), `${route}: should not redirect to /login`).not.toContain('/login')
      })
    }

    // ── Admin-only routes ─────────────────────────────────────────────────

    if (role === 'admin') {
      for (const route of ADMIN_ONLY_ROUTES) {
        test(`${route} → 200, no server error (admin)`, async ({ page }) => {
          const response = await page.goto(route)
          expect(
            response?.status(),
            `${route}: HTTP status should be < 500`,
          ).toBeLessThan(500)
          await expectNoServerError(page, route)
          expect(page.url()).toContain(route)
        })
      }
    } else {
      for (const route of ADMIN_ONLY_ROUTES) {
        test(`${route} → clean redirect to /dashboard (non-admin)`, async ({ page }) => {
          await page.goto(route)
          // Non-admins should be redirected — that's the correct behaviour, not an error.
          await expect(
            page,
            `${route}: non-admin ${role} should land on /dashboard`,
          ).toHaveURL(/\/dashboard/)
        })
      }
    }

    // ── Dynamic [id] detail pages ─────────────────────────────────────────

    for (const { list, hrefPrefix } of DYNAMIC_ROUTES) {
      test(`${list}/[id] → 200, no server error`, async ({ page }) => {
        await page.goto(list)

        // Find the first anchor whose href points to a detail page.
        // Next.js renders <Link href="/value-streams/{uuid}"> as a plain <a>.
        const detailLink = page
          .locator(`a[href^="${hrefPrefix}"]`)
          .first()

        const count = await detailLink.count()
        test.skip(count === 0, `No seeded items found at ${list} — skipping detail page check`)

        const href = await detailLink.getAttribute('href')
        if (!href) return // shouldn't happen after the count check, but keeps TS happy

        const response = await page.goto(href)
        expect(
          response?.status(),
          `${href}: HTTP status should be < 500`,
        ).toBeLessThan(500)
        await expectNoServerError(page, href)
      })
    }
  })
}
