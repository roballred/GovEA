/**
 * Auth security regression tests.
 *
 * Covers:
 *   - Deactivated-user login (pre-existing)
 *   - Auth redirect consistency (#386): sign-out always lands on /login;
 *     /error always redirects to /login; dead-end callbackUrls are rejected
 *
 * Capability: iam-user-management, iam-sso-authentication, iam-local-authentication
 * Persona: CMS Administrator
 */

import { test, expect, type Page } from '@playwright/test'

const TEST_PASSWORD = 'GovEA-Auth-99!'

/** Log in via the local credentials form. Returns true if login succeeded. */
async function tryLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  // Success lands on /dashboard; failure stays on /login (with an error)
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 10_000 })
  return page.url().includes('/dashboard')
}

test.describe('deactivated user cannot log in', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })
  // Multiple browser contexts + bcrypt in beforeAll make this slow in CI
  test.slow()

  const email = `e2e-deactivated-${Date.now()}@govea.test`

  test.beforeAll(async ({ browser }) => {
    // Create a test user as contributor
    const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
    const page = await ctx.newPage()
    await page.goto('/users')

    await page.getByRole('button', { name: '+ Add user' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add user' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Name').fill('E2E Deactivated')
    await dialog.getByLabel('Email').fill(email)
    await dialog.getByLabel('Password').fill(TEST_PASSWORD)
    await dialog.locator('#create-role').selectOption('contributor')
    await dialog.getByRole('button', { name: 'Create user' }).click()
    await expect(dialog).not.toBeVisible()

    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    // Reactivate and delete the test user so the DB is clean
    const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
    const page = await ctx.newPage()
    await page.goto('/users')

    const row = page.locator('tr').filter({ hasText: email })
    if ((await row.count()) > 0) {
      const reactivate = row.getByRole('button', { name: 'Reactivate' })
      if ((await reactivate.count()) > 0) await reactivate.click()
      await page.locator('tr').filter({ hasText: email }).getByRole('button', { name: 'Delete' }).click()
      await page.getByRole('dialog', { name: 'Delete user' }).getByRole('button', { name: 'Delete' }).click()
    }

    await ctx.close()
  })

  test('active user can log in with valid credentials', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const success = await tryLogin(page, email, TEST_PASSWORD)
    expect(success, 'active user should reach /dashboard').toBe(true)
    await ctx.close()
  })

  test('deactivated user is denied login', async ({ browser }) => {
    // Deactivate the user via admin session
    const adminCtx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
    const adminPage = await adminCtx.newPage()
    await adminPage.goto('/users')
    await adminPage.locator('tr').filter({ hasText: email }).getByRole('button', { name: 'Deactivate' }).click()
    await expect(
      adminPage.locator('tr').filter({ hasText: email }).getByText('Inactive'),
    ).toBeVisible()
    await adminCtx.close()

    // Now attempt login as the deactivated user
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const success = await tryLogin(page, email, TEST_PASSWORD)
    expect(success, 'deactivated user must not reach /dashboard').toBe(false)
    await ctx.close()
  })

  test('deactivated user with active session is redirected on next request', async ({ browser }) => {
    // Reactivate first so the user can log in
    const adminCtx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
    const adminPage = await adminCtx.newPage()
    await adminPage.goto('/users')
    const row = adminPage.locator('tr').filter({ hasText: email })
    const reactivate = row.getByRole('button', { name: 'Reactivate' })
    if ((await reactivate.count()) > 0) await reactivate.click()

    // Log in as the user to get an active session
    const userCtx = await browser.newContext()
    const userPage = await userCtx.newPage()
    const loginOk = await tryLogin(userPage, email, TEST_PASSWORD)
    expect(loginOk).toBe(true)

    // Deactivate them while their session is live
    await row.getByRole('button', { name: 'Deactivate' }).click()
    await expect(row.getByText('Inactive')).toBeVisible()
    await adminCtx.close()

    // The user's existing session should be invalidated on the next navigation.
    // The jwt callback re-validates isActive and returns null, clearing the cookie.
    await userPage.goto('/dashboard')
    await expect(userPage).toHaveURL(/\/login/, { timeout: 10_000 })

    await userCtx.close()
  })
})

// ---------------------------------------------------------------------------
// Auth redirect consistency (#386)
// ---------------------------------------------------------------------------

test.describe('sign-out redirects to /login', () => {
  test('sign-out from admin area lands on /login', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
    const page = await ctx.newPage()
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await ctx.close()
  })
})

test.describe('/error page redirects to /login', () => {
  test('/error without query string redirects to /login', async ({ page }) => {
    await page.goto('/error')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('/error?error=AccessDenied redirects to /login and preserves error code', async ({ page }) => {
    await page.goto('/error?error=AccessDenied')
    await expect(page).toHaveURL(/\/login\?error=AccessDenied/, { timeout: 10_000 })
  })
})

test.describe('callbackUrl loop prevention', () => {
  test('/login?callbackUrl=/login redirects to /dashboard after sign-in', async ({ page }) => {
    await page.goto('/login?callbackUrl=%2Flogin')
    await page.getByLabel('Email').fill('alice@govea.dev')
    await page.getByLabel('Password').fill('dev-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('/login?callbackUrl=/error redirects to /dashboard after sign-in', async ({ page }) => {
    await page.goto('/login?callbackUrl=%2Ferror')
    await page.getByLabel('Email').fill('alice@govea.dev')
    await page.getByLabel('Password').fill('dev-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
})
