import { test, expect } from '@playwright/test'

// Requires dev seed: DEV=true pnpm --filter govea db:seed

test.describe('First-run setup', () => {
  test('setup page loads and shows the wizard', async ({ page }) => {
    await page.goto('/setup')
    await expect(page.getByRole('heading', { name: 'Set up GovEA' })).toBeVisible()
  })
})

test.describe('Dev login shortcuts', () => {
  test('admin can sign in via dev shortcut', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Dev shortcuts')).toBeVisible()
    await page.getByRole('button', { name: 'Sign in as Admin' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('admin')).toBeVisible()
  })

  test('contributor can sign in via dev shortcut', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in as Contributor' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('contributor')).toBeVisible()
  })

  test('viewer can sign in via dev shortcut', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in as Viewer' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('viewer')).toBeVisible()
  })
})

test.describe('RBAC enforcement', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('viewer is redirected away from /users', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in as Viewer' }).click()
    await page.goto('/users')
    await expect(page).toHaveURL('/dashboard')
  })

  test('contributor is redirected away from /users', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in as Contributor' }).click()
    await page.goto('/users')
    await expect(page).toHaveURL('/dashboard')
  })

  test('admin can access /users', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in as Admin' }).click()
    await page.goto('/users')
    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})

test.describe('Sign out', () => {
  test('signing out redirects to /login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in as Viewer' }).click()
    await expect(page).toHaveURL('/dashboard')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')
  })
})
