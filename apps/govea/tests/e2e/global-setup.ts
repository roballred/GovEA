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
  { name: 'admin',       shortcutLabel: 'Riverdale Admin',       file: 'admin.json'       },
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
    // Role-aware landing per defaultLandingPath() in @/lib/auth-redirect:
    //   instance admin → /instance
    //   viewer         → /executive (#548)
    //   everyone else  → /dashboard
    // Wait for any of the three so the seed-step works regardless of which
    // role this iteration is signing in as.
    await page.waitForURL(/\/(dashboard|executive|instance)(\?|$)/)

    await context.storageState({ path: path.join(AUTH_DIR, role.file) })
    await context.close()

    console.log(`  ✓ auth state saved for ${role.name}`)
  }

  await browser.close()
}
