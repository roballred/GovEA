/**
 * Sign-out reliability regression tests (#759).
 *
 * Sign-out used to be an inline Server Action form; action ids are
 * deployment-specific, so stale tabs failed with "Failed to find Server
 * Action" instead of signing out. It now posts to the deploy-stable
 * /api/auth/logout route handler. These tests pin:
 *
 *   1. sign-out works from a regular admin route and from an instance route
 *   2. the session is actually gone afterwards (protected routes bounce)
 *   3. the rendered form posts to the fixed URL — the structural property
 *      that makes the stale-tab failure impossible (a true post-deploy stale
 *      tab can't be simulated in a single-deploy test run)
 *
 * Runs in the CI e2e job alongside smoke/overview/a11y.
 *
 * Capability: iam-local-authentication, iam-audit-trail
 * Persona: CMS Administrator, Instance Administrator
 */

import { test, expect, type BrowserContext } from '@playwright/test'

async function signOutAndVerify(ctx: BrowserContext, startRoute: string) {
  const page = await ctx.newPage()
  await page.goto(startRoute)
  expect(page.url(), `should be signed in when visiting ${startRoute}`).not.toContain('/login')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page, 'sign-out should land on /login').toHaveURL(/\/login/, { timeout: 10_000 })

  // Session must actually be invalidated, not just redirected once.
  await page.goto('/dashboard')
  await expect(page, 'protected route should bounce after sign-out').toHaveURL(/\/login/, {
    timeout: 10_000,
  })
}

test('sign-out works from a regular admin route', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
  await signOutAndVerify(ctx, '/capabilities')
  await ctx.close()
})

test('sign-out works from an instance route', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/state-admin.json' })
  await signOutAndVerify(ctx, '/instance')
  await ctx.close()
})

test('sign-out form posts to the deploy-stable URL, not a Server Action', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
  const page = await ctx.newPage()
  await page.goto('/dashboard')

  const form = page.getByRole('button', { name: 'Sign out' }).locator('xpath=ancestor::form')
  await expect(form, 'sign-out form should post to /api/auth/logout').toHaveAttribute(
    'action',
    '/api/auth/logout',
  )
  await expect(form).toHaveAttribute('method', /post/i)
  await ctx.close()
})
