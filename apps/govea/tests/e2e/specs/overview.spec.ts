/**
 * /overview — stakeholder-facing landing (#614 slice A).
 *
 * The page is authenticated-only and visible to every role (admin,
 * contributor, viewer). This spec confirms each role can reach it and
 * that the page renders its identifying heading.
 *
 * No admin-only configuration content should appear on the page, but
 * that is enforced by the page itself (no admin data fetched). Tests
 * here verify access, not authorization details.
 *
 * Capability: ac-feature-management (stakeholder product surface)
 * Persona: department-director; elected-official; early-maturity-practice-lead
 */

import { test, expect } from '@playwright/test'

const ROLES = ['admin', 'contributor', 'viewer'] as const

for (const role of ROLES) {
  test(`${role} can access /overview`, async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: `tests/e2e/.auth/${role}.json`,
    })
    const page = await ctx.newPage()
    const response = await page.goto('/overview')

    expect(
      response?.status(),
      `${role}: HTTP status should be < 500`,
    ).toBeLessThan(500)

    expect(page.url(), `${role}: should not redirect to /login`).not.toContain('/login')
    expect(page.url(), `${role}: should land on /overview`).toContain('/overview')

    await expect(
      page.getByRole('heading', { name: /GovEA at a glance/i }),
      `${role}: overview heading should render`,
    ).toBeVisible()

    await ctx.close()
  })
}
