/**
 * Value stream detail vs edit separation (#726).
 *
 * The detail page (`/value-streams/[id]`) is read-oriented: it shows the
 * ordered stages, stage capability badges, and linked capabilities/personas,
 * but exposes no controls to add/edit/reorder stages, manage stage
 * capabilities, or add/remove personas. All authoring lives on the dedicated
 * edit view (`/value-streams/[id]/edit`), reached via a single "Edit value
 * stream" affordance.
 *
 * Capability: po-value-streams
 * Persona: Enterprise Architect, Agency EA Coordinator
 *
 * Requires the seeded demo org (the admin storageState org has value streams).
 */

import { test, expect } from '@playwright/test'

test.use({ storageState: 'tests/e2e/.auth/admin.json' })

test('detail view is read-only; authoring lives on the edit view', async ({ page }) => {
  await page.goto('/value-streams')

  // Open the first value stream's detail page (links carry an id segment; the
  // nav "/value-streams" link has no trailing id and is excluded).
  const firstStream = page.locator('a[href^="/value-streams/"]').first()
  await expect(firstStream, 'seed should provide at least one value stream').toBeVisible()

  // Retry the click+navigation as a unit: a Next.js <Link> click landing in the
  // hydration window can be swallowed (handler attached before the client router
  // is ready), leaving the URL on the list page (#818). toPass re-clicks until
  // the navigation actually happens.
  await expect(async () => {
    await firstStream.click()
    await expect(page, 'should be on a value stream detail page').toHaveURL(/\/value-streams\/[0-9a-f-]+$/, { timeout: 2000 })
  }).toPass()

  // Read-only: no stage/persona/capability mutation controls on the detail page.
  await expect(page.getByRole('button', { name: '+ Add stage' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /add capabilit/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /add persona/i })).toHaveCount(0)

  // Single edit affordance present (admin can mutate the org's own stream).
  const editLink = page.getByRole('link', { name: 'Edit value stream' })
  await expect(editLink).toBeVisible()

  // Same hydration-race guard as above (#818).
  await expect(async () => {
    await editLink.click()
    await expect(page).toHaveURL(/\/value-streams\/[0-9a-f-]+\/edit$/, { timeout: 2000 })
  }).toPass()
  await expect(page.getByRole('button', { name: '+ Add stage' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Edit value stream' })).toBeVisible()
})
