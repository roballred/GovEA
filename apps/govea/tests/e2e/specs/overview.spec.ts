/**
 * /overview — stakeholder-facing landing (#614 slices A + B).
 *
 * The page is authenticated-only and visible to every role (admin,
 * contributor, viewer). This spec confirms each role can reach it,
 * that the page renders its identifying heading, and that the
 * "Start here" CTAs are role-gated correctly so Viewers never see
 * admin-only routes.
 *
 * Coverage:
 *   - Every role can reach /overview and sees the heading.
 *   - Every role sees the always-on read CTAs (Executive Summary).
 *   - Contributor + Admin see the Audit log CTA; Viewer does not.
 *   - Admin sees the Manage users CTA; Contributor + Viewer do not.
 *
 * Capability: ac-feature-management (stakeholder product surface)
 * Persona: department-director; elected-official; early-maturity-practice-lead
 */

import { test, expect, type Page } from '@playwright/test'

const ROLES = ['admin', 'contributor', 'viewer'] as const

// ── Per-role access + heading ────────────────────────────────────────────────

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

// ── Role-aware CTA gating ────────────────────────────────────────────────────
//
// The "Start here" section is filtered by role. CTA cards link to existing
// routes; here we only check whether each card is present, not the
// destination behavior (covered by iam.spec.ts and the smoke sweep).

/** Return a locator inside the Start here section so other tiles can't match. */
function startHere(page: Page) {
  return page.getByTestId('overview-start-here')
}

test('admin sees Manage users CTA', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
  const page = await ctx.newPage()
  await page.goto('/overview')
  await expect(startHere(page).getByRole('link', { name: /Manage users/i })).toBeVisible()
  await expect(startHere(page).getByRole('link', { name: /Audit log/i })).toBeVisible()
  await ctx.close()
})

test('contributor does not see Manage users CTA but does see Audit log', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/contributor.json' })
  const page = await ctx.newPage()
  await page.goto('/overview')
  await expect(startHere(page).getByRole('link', { name: /Manage users/i })).toHaveCount(0)
  await expect(startHere(page).getByRole('link', { name: /Audit log/i })).toBeVisible()
  await ctx.close()
})

test('viewer sees neither Manage users nor Audit log CTA', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/viewer.json' })
  const page = await ctx.newPage()
  await page.goto('/overview')
  await expect(startHere(page).getByRole('link', { name: /Manage users/i })).toHaveCount(0)
  await expect(startHere(page).getByRole('link', { name: /Audit log/i })).toHaveCount(0)
  // Read-only CTAs always show, regardless of role.
  await expect(startHere(page).getByRole('link', { name: /Executive Summary/i })).toBeVisible()
  await ctx.close()
})

// ── Coming-next priorities tile (slice C) ────────────────────────────────────
//
// The tile mirrors docs/product-priorities.md (see the page header comment).
// Role-agnostic: priorities are honest signal, not workspace configuration.
// Spot-checking the rank-1 title surfaces any doc/page drift in CI.

test('coming-next tile renders all five priorities for each role', async ({ browser }) => {
  for (const role of ROLES) {
    const ctx = await browser.newContext({ storageState: `tests/e2e/.auth/${role}.json` })
    const page = await ctx.newPage()
    await page.goto('/overview')
    const section = page.getByTestId('overview-coming-next')
    await expect(section, `${role}: coming-next section should render`).toBeVisible()
    await expect(
      section.locator('ol > li'),
      `${role}: should see 5 priority rows`,
    ).toHaveCount(5)
    // Rank-1 spot-check: matches docs/product-priorities.md Top Five row 1.
    await expect(
      section.getByRole('heading', { name: /Run the first persona-validation Tier-1 interview/i }),
    ).toBeVisible()
    await ctx.close()
  }
})
