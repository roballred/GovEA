/**
 * Playwright global setup — runs once before all tests.
 *
 * Authenticates as each of the seeded test roles and saves the resulting
 * session cookies to `.auth/<role>.json`.  Tests load these storageState
 * files instead of going through the login flow on every run, which keeps
 * the suite fast and avoids chatty UI interactions.
 *
 * Requires:
 *   - The app is already running (Playwright's webServer config starts it).
 *   - The database has been seeded with DEV=true and the app exposes demo
 *     shortcuts via NODE_ENV=development, DEV=true, or DEMO_MODE=true.
 */

import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')

const DEV_ROLES = [
  // alice is the seeded multi-org user (#693): she hits the /select-org step
  // (#800), so her expected workspace is named for the click-through below.
  { name: 'admin',       shortcutLabel: 'Riverdale Admin',       file: 'admin.json', selectOrg: 'City of Riverdale' },
  { name: 'contributor', shortcutLabel: 'Riverdale Contributor', file: 'contributor.json' },
  { name: 'viewer',      email: 'victor@govea.dev', password: 'dev-password', file: 'viewer.json' },
  { name: 'state-admin', shortcutLabel: 'State Admin',           file: 'state-admin.json' },
] as const

export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

  // Ensure the .auth directory exists (it is .gitignore'd)
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }

  const browser = await chromium.launch()

  for (const role of DEV_ROLES) {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${baseURL}/login`)

    if ('shortcutLabel' in role) {
      // Demo shortcut buttons call the
      // server action with a pre-set email and the shared dev-password.
      await page.getByRole('button', { name: role.shortcutLabel }).click()
    } else {
      await page.getByLabel('Email').fill(role.email)
      await page.getByLabel('Password').fill(role.password)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    }
    // Role-aware landing per postLoginDestination() in @/lib/auth-redirect:
    //   instance admin → /instance
    //   multi-org      → /select-org (#800) — click the expected workspace
    //   viewer         → /executive (#548)
    //   everyone else  → /dashboard
    await page.waitForURL(/\/(dashboard|executive|instance|select-org)(\?|$)/)
    if (page.url().includes('/select-org')) {
      if (!('selectOrg' in role)) {
        throw new Error(`${role.name} unexpectedly hit /select-org — add a selectOrg workspace to DEV_ROLES`)
      }
      await page.getByRole('button', { name: role.selectOrg }).click()
      await page.waitForURL(/\/(dashboard|executive)(\?|$)/)
    }

    await context.storageState({ path: path.join(AUTH_DIR, role.file) })
    await context.close()

    console.log(`  ✓ auth state saved for ${role.name}`)
  }

  await browser.close()
}
