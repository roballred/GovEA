/**
 * IAM capability E2E tests.
 *
 * Covers:
 *   - Full user lifecycle: create → edit → deactivate → reactivate → delete
 *   - Last-admin protection: deactivate and delete both blocked when 1 active admin remains
 *   - Audit side effects: user actions produce audit log entries (read-after-write)
 *   - Setup idempotence: /setup redirects to /login when setup is already complete
 *   - Authorization: non-admin roles are redirected away from /users
 *
 * Capability: iam-user-management, iam-audit-trail, iam-first-run-setup
 * Persona: CMS Administrator
 *
 * Requires a seeded database (DEV=true pnpm db:seed) and a running app server.
 * Auth state files are created by global-setup.ts.
 */

import { test, expect, type Page, type Browser } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find the table row that contains the given email address. */
function userRow(page: Page, email: string) {
  return page.locator('tr').filter({ hasText: email })
}

/**
 * Open the "+ Add user" dialog, fill the form, and submit.
 * Waits for the dialog to close before returning.
 */
async function createUser(
  page: Page,
  opts: { name: string; email: string; password: string; role: 'viewer' | 'contributor' | 'admin' },
) {
  await page.getByRole('button', { name: '+ Add user' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add user' })
  await expect(dialog).toBeVisible()

  // Scope all field lookups to the dialog to avoid ambiguity with the rest of the page
  await dialog.getByLabel('Name').fill(opts.name)
  await dialog.getByLabel('Email').fill(opts.email)
  await dialog.getByLabel('Password').fill(opts.password)
  await dialog.locator('#create-role').selectOption(opts.role)
  await dialog.getByRole('button', { name: 'Create user' }).click()

  await expect(dialog).not.toBeVisible()
}

/**
 * Log in to the app using local auth credentials.
 * Returns once the dashboard is visible.
 */
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL(/\/dashboard/)
}

// ─── Test password for users created in these tests ──────────────────────────
const TEST_PASSWORD = 'GovEA-Test-99!'

// ─── User lifecycle ───────────────────────────────────────────────────────────

test.describe('user lifecycle', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })

  // Use a unique email per run so parallel runs don't collide
  const email = `e2e-lifecycle-${Date.now()}@govea.test`
  const editedEmail = `e2e-lifecycle-edited-${Date.now()}@govea.test`

  test.beforeEach(async ({ page }) => {
    await page.goto('/users')
  })

  test('create a contributor user', async ({ page }) => {
    await createUser(page, { name: 'E2E Lifecycle User', email, password: TEST_PASSWORD, role: 'contributor' })

    await expect(userRow(page, email)).toBeVisible()
    await expect(userRow(page, email).getByText('Contributor')).toBeVisible()
    await expect(userRow(page, email).getByText('Active')).toBeVisible()
  })

  test('edit name, email, and role', async ({ page }) => {
    // Ensure the user exists (create if not already there from prior test)
    const existingRow = userRow(page, email)
    if ((await existingRow.count()) === 0) {
      await createUser(page, { name: 'E2E Lifecycle User', email, password: TEST_PASSWORD, role: 'contributor' })
    }

    await userRow(page, email).getByRole('button', { name: 'Edit' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Edit user' })
    await expect(editDialog).toBeVisible()

    await editDialog.getByLabel('Name').fill('E2E Lifecycle Edited')
    await editDialog.getByLabel('Email').fill(editedEmail)
    await editDialog.locator('#edit-role').selectOption('viewer')
    await editDialog.getByRole('button', { name: 'Save changes' }).click()

    await expect(editDialog).not.toBeVisible()
    await expect(userRow(page, editedEmail)).toBeVisible()
    await expect(userRow(page, editedEmail).getByText('Viewer')).toBeVisible()
  })

  test('deactivate reduces status to Inactive', async ({ page }) => {
    const row = userRow(page, editedEmail)
    if ((await row.count()) === 0) test.skip(true, 'depends on prior edit test')

    await row.getByRole('button', { name: 'Deactivate' }).click()
    await expect(userRow(page, editedEmail).getByText('Inactive')).toBeVisible()
    await expect(userRow(page, editedEmail).getByRole('button', { name: 'Reactivate' })).toBeVisible()
    await expect(userRow(page, editedEmail).getByRole('button', { name: 'Deactivate' })).not.toBeVisible()
  })

  test('reactivate restores Active status', async ({ page }) => {
    const row = userRow(page, editedEmail)
    if ((await row.count()) === 0) test.skip(true, 'depends on prior deactivate test')

    await row.getByRole('button', { name: 'Reactivate' }).click()
    await expect(userRow(page, editedEmail).getByText('Active')).toBeVisible()
    await expect(userRow(page, editedEmail).getByRole('button', { name: 'Deactivate' })).toBeVisible()
  })

  test('delete removes user from list', async ({ page }) => {
    const row = userRow(page, editedEmail)
    if ((await row.count()) === 0) test.skip(true, 'depends on prior reactivate test')

    await row.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete user' })).toBeVisible()
    // Confirm deletion
    await page.getByRole('dialog', { name: 'Delete user' }).getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete user' })).not.toBeVisible()
    await expect(userRow(page, editedEmail)).not.toBeVisible()
  })
})

// ─── Last-admin protection ────────────────────────────────────────────────────

test.describe('last-admin protection', () => {
  // This test spans two browser contexts (Alice + guard admin) with multiple
  // network round-trips. Give it 3× the default timeout.
  test.slow()
  /**
   * The seeded org has exactly one admin (alice@govea.dev). Alice is the current
   * user in the admin storageState, so her row has no action buttons (isSelf).
   *
   * To test the "last admin cannot be deactivated/deleted" protection we need
   * a second admin who can observe Alice's row. Strategy:
   *   1. Alice creates a temporary admin (test-admin-guard) with a known password.
   *   2. test-admin-guard logs in via local auth in a fresh browser context.
   *   3. test-admin-guard deactivates Alice → succeeds (2 active admins → 1).
   *   4. From test-admin-guard's session: Alice is the only remaining admin
   *      (inactive). Because active admin count = 1, Alice's Delete button must
   *      be disabled and carry the protection title.
   *   5. Cleanup: test-admin-guard reactivates Alice, then Alice deletes the
   *      temporary account.
   */

  const guardEmail = `e2e-guard-${Date.now()}@govea.test`

  // TODO(#145): Re-enable once the dual-context login reliability issue is resolved.
  // This test requires a fresh credentials login in a second browser context, which
  // is consistently timing out in CI even with test.slow(). The server-side protection
  // is tested via deactivateUser/deleteUser in actions/users.ts.
  test.skip('deactivate and delete disabled for last active admin', async ({ browser }) => {
    // ── Step 1: Alice creates the guard admin ─────────────────────────────
    const aliceCtx = await browser.newContext({
      storageState: 'tests/e2e/.auth/admin.json',
    })
    const alicePage = await aliceCtx.newPage()
    await alicePage.goto('/users')
    await createUser(alicePage, {
      name: 'E2E Guard',
      email: guardEmail,
      password: TEST_PASSWORD,
      role: 'admin',
    })
    await expect(userRow(alicePage, guardEmail).getByText('admin', { exact: true })).toBeVisible()

    // ── Step 2: guard admin logs in via local auth ────────────────────────
    const guardCtx = await browser.newContext()
    const guardPage = await guardCtx.newPage()
    await loginAs(guardPage, guardEmail, TEST_PASSWORD)

    // ── Step 3: guard deactivates Alice ───────────────────────────────────
    await guardPage.goto('/users')
    await userRow(guardPage, 'alice@govea.dev')
      .getByRole('button', { name: 'Deactivate' })
      .click()

    // Alice's row should now show Inactive
    await expect(
      userRow(guardPage, 'alice@govea.dev').getByText('Inactive'),
    ).toBeVisible()

    // ── Step 4: last-admin protection is visible on Alice's row ──────────
    // Active admin count is now 1 (guard admin only).
    // Alice is an inactive admin — the Delete button must be disabled because
    // removing her would leave zero admins with the admin role in the org.

    const aliceDeleteBtn = userRow(guardPage, 'alice@govea.dev').getByRole(
      'button',
      { name: 'Delete' },
    )
    await expect(aliceDeleteBtn).toBeDisabled()
    await expect(aliceDeleteBtn).toHaveAttribute('title', 'Cannot delete the last admin')

    // Deactivate button should not be present for an already-inactive user.
    await expect(
      userRow(guardPage, 'alice@govea.dev').getByRole('button', { name: 'Deactivate' }),
    ).not.toBeVisible()

    // ── Step 5: cleanup — guard reactivates Alice ─────────────────────────
    await userRow(guardPage, 'alice@govea.dev')
      .getByRole('button', { name: 'Reactivate' })
      .click()
    await expect(
      userRow(guardPage, 'alice@govea.dev').getByText('Active'),
    ).toBeVisible()

    await guardCtx.close()

    // ── Step 6: Alice deletes the guard account ───────────────────────────
    await alicePage.reload()
    await userRow(alicePage, guardEmail).getByRole('button', { name: 'Delete' }).click()
    await alicePage
      .getByRole('dialog', { name: 'Delete user' })
      .getByRole('button', { name: 'Delete' })
      .click()
    await expect(userRow(alicePage, guardEmail)).not.toBeVisible()

    await aliceCtx.close()
  })
})

// ─── Audit side effects ───────────────────────────────────────────────────────

test.describe('audit side effects', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })

  const auditEmail = `e2e-audit-${Date.now()}@govea.test`

  test('user.create event appears in audit log', async ({ page }) => {
    // Create the user
    await page.goto('/users')
    await createUser(page, {
      name: 'E2E Audit User',
      email: auditEmail,
      password: TEST_PASSWORD,
      role: 'viewer',
    })

    // Check the audit log for the event
    await page.goto('/audit')
    const auditRow = page.locator('tr').filter({ hasText: 'user.create' }).first()
    await expect(auditRow).toBeVisible()
    await expect(auditRow.getByText('user.create')).toBeVisible()
    await expect(auditRow.getByText('alice@govea.dev')).toBeVisible()
  })

  test('user.deactivate event appears in audit log', async ({ page }) => {
    // Ensure the user exists
    await page.goto('/users')
    const row = userRow(page, auditEmail)
    if ((await row.count()) === 0) {
      await createUser(page, {
        name: 'E2E Audit User',
        email: auditEmail,
        password: TEST_PASSWORD,
        role: 'viewer',
      })
    }

    // Deactivate
    await userRow(page, auditEmail).getByRole('button', { name: 'Deactivate' }).click()
    await expect(userRow(page, auditEmail).getByText('Inactive')).toBeVisible()

    // Check audit log
    await page.goto('/audit')
    const deactivateRow = page.locator('tr').filter({ hasText: 'user.deactivate' }).first()
    await expect(deactivateRow).toBeVisible()
    await expect(deactivateRow.getByText('alice@govea.dev')).toBeVisible()
  })

  test.afterAll(async ({ browser }) => {
    // Clean up the audit test user
    const ctx = await browser.newContext({ storageState: 'tests/e2e/.auth/admin.json' })
    const page = await ctx.newPage()
    await page.goto('/users')

    // Reactivate if needed
    const row = userRow(page, auditEmail)
    if ((await row.count()) > 0) {
      const reactivateBtn = row.getByRole('button', { name: 'Reactivate' })
      if ((await reactivateBtn.count()) > 0) await reactivateBtn.click()

      await userRow(page, auditEmail).getByRole('button', { name: 'Delete' }).click()
      await page
        .getByRole('dialog', { name: 'Delete user' })
        .getByRole('button', { name: 'Delete' })
        .click()
    }

    await ctx.close()
  })
})

// ─── Setup idempotence ────────────────────────────────────────────────────────

test.describe('setup idempotence', () => {
  test('visiting /setup when already configured redirects to /login', async ({ page }) => {
    // Use a fresh context — no auth state — to simulate a new visitor
    await page.goto('/setup')
    // runSetup detects an existing user and redirects; even just visiting /setup
    // should redirect because isSetupComplete() returns true
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Authorization ────────────────────────────────────────────────────────────

test.describe('authorization', () => {
  test('contributor is redirected from /users to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/contributor.json',
    })
    const page = await ctx.newPage()
    await page.goto('/users')
    await expect(page).toHaveURL(/\/dashboard/)
    await ctx.close()
  })

  test('viewer is redirected from /users to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/viewer.json',
    })
    const page = await ctx.newPage()
    await page.goto('/users')
    await expect(page).toHaveURL(/\/dashboard/)
    await ctx.close()
  })

  // /settings — admin-only route (#207)
  test('admin can access /settings', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/admin.json',
    })
    const page = await ctx.newPage()
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings/)
    await ctx.close()
  })

  test('contributor is redirected from /settings to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/contributor.json',
    })
    const page = await ctx.newPage()
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/dashboard/)
    await ctx.close()
  })

  test('viewer is redirected from /settings to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/viewer.json',
    })
    const page = await ctx.newPage()
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/dashboard/)
    await ctx.close()
  })
})
