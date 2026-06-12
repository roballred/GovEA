/**
 * Sign-out reliability regression tests (#759).
 *
 * Sign-out used to be an inline Server Action form; action ids are
 * deployment-specific, so stale tabs failed with "Failed to find Server
 * Action" instead of signing out. It now posts to the deploy-stable
 * /api/auth/logout route handler. Two layers of coverage:
 *
 *  - CONTRACT tests drive the endpoint through Playwright's request API with
 *    no page open, so nothing can interfere: 303 → /login, session-token
 *    cookie(s) expired on the response, no live session cookie left in the
 *    jar, and protected routes bounce afterwards. (The raw handler behavior
 *    is also verified curl-level in tests/unit/logout-route.test.ts.)
 *
 *  - CLICK tests assert the user-visible flow from both shells AND act as
 *    the #782 regression gate: clicking Sign out on a LIVE page (in-flight
 *    session refetches and all) must leave the session dead. A racing
 *    refresh may re-set a rolled cookie after logout's deletion, but the
 *    logged-out marker (#782) makes middleware reject and delete it on the
 *    next request — so the post-logout bounce and jar assertions here hold
 *    even when the race fires.
 *
 * Runs in the CI e2e job alongside smoke/overview/a11y.
 *
 * Capability: iam-local-authentication, iam-audit-trail
 * Persona: CMS Administrator, Instance Administrator
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

/** Sign in as Ivan (seeded instance admin) via the dev login shortcut. */
async function loginAsInstanceAdmin(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Ivan — Instance Admin (dev)' }).click()
  await page.waitForURL(/\/instance/, { timeout: 10_000 })
  await page.waitForLoadState('networkidle')
}

/**
 * Drive the logout endpoint via the context-level request API (shares the
 * cookie jar, exposes raw headers, and — with every page closed — nothing
 * can race the deletion) and pin the full #759 contract.
 */
async function expectLogoutContract(ctx: BrowserContext) {
  const res = await ctx.request.post('/api/auth/logout', { maxRedirects: 0 })

  expect(res.status(), 'logout should respond 303').toBe(303)
  // Relative on purpose (#794): an absolute Location built from request.url
  // points at the container bind address (https://0.0.0.0/login) behind a
  // TLS-terminating proxy. Relative resolves against the user's real origin.
  expect(
    res.headers()['location'],
    'logout should redirect to a relative /login, never a host-derived or caller-controlled target',
  ).toBe('/login')

  const deletions = res
    .headersArray()
    .filter(h => h.name.toLowerCase() === 'set-cookie' && h.value.includes('session-token'))
  expect(deletions.length, 'logout response should expire session-token cookie(s)').toBeGreaterThan(0)
  for (const d of deletions) {
    expect(d.value, 'session-token deletion should use an epoch expiry').toContain(
      'Expires=Thu, 01 Jan 1970',
    )
  }

  const surviving = (await ctx.cookies())
    .filter(c => c.name.includes('session-token') && c.value !== '')
    .map(c => `${c.name} (path=${c.path}, valueLength=${c.value.length})`)
  expect(surviving, 'no live session cookie may survive logout').toEqual([])

  // Session must actually be dead, not just cookie-trimmed locally.
  const page = await ctx.newPage()
  await page.goto('/dashboard')
  await expect(page, 'protected route should bounce after logout').toHaveURL(/\/login/, {
    timeout: 10_000,
  })
  await page.close()
}

test('logout endpoint contract — admin session', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
  await expectLogoutContract(ctx)
  await ctx.close()
})

test('logout endpoint contract — instance admin session', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await loginAsInstanceAdmin(page)
  // Close the page so no in-flight session refetch can race the deletion
  // (that race is #782's scope, not this contract's).
  await page.close()

  await expectLogoutContract(ctx)
  await ctx.close()
})

/**
 * #782 regression gate: after a sign-out clicked on a LIVE page, the session
 * must be dead even if a racing session refresh re-set a rolled cookie after
 * logout's deletion — middleware rejects pre-logout tokens via the
 * logged-out marker and deletes their cookies on the next request.
 */
async function expectSessionDeadAfterClick(page: Page) {
  await page.goto('/dashboard')
  await expect(page, 'protected route should bounce after sign-out (#782)').toHaveURL(/\/login/, {
    timeout: 10_000,
  })

  const surviving = (await page.context().cookies())
    .filter(c => c.name.includes('session-token') && c.value !== '')
    .map(c => `${c.name} (valueLength=${c.value.length})`)
  expect(surviving, 'no live session cookie may survive sign-out (#782)').toEqual([])
}

test('sign-out button works from a regular admin route', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
  const page = await ctx.newPage()
  await page.goto('/capabilities')
  await expect(page, 'should be on /capabilities before signing out').toHaveURL(/\/capabilities/)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page, 'sign-out should land on /login').toHaveURL(/\/login/, { timeout: 10_000 })
  await expectSessionDeadAfterClick(page)
  await ctx.close()
})

test('sign-out button works from an instance route', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await loginAsInstanceAdmin(page)
  await expect(page, 'should be on /instance before signing out').toHaveURL(/\/instance/)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page, 'sign-out should land on /login').toHaveURL(/\/login/, { timeout: 10_000 })
  await expectSessionDeadAfterClick(page)
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
