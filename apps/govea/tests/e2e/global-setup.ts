/**
 * Playwright global setup — runs once before all tests.
 *
 * Authenticates as each of the four dev roles and saves the resulting
 * session cookies to `.auth/<role>.json`.  Tests load these storageState
 * files instead of going through the login flow on every run, which keeps
 * the suite fast and avoids chatty UI interactions.
 *
 * Requires:
 *   - The app is already running (Playwright's webServer config starts it).
 *   - The database has been seeded with DEV=true so dev-shortcut buttons exist.
 */

import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')

const DEV_ROLES = [
  { name: 'admin',       label: 'Sign in as Admin',       file: 'admin.json'       },
  { name: 'contributor', label: 'Sign in as Contributor', file: 'contributor.json' },
  { name: 'viewer',      label: 'Sign in as Viewer',      file: 'viewer.json'      },
  { name: 'state-admin', label: 'Sign in as State Admin', file: 'state-admin.json' },
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

    // Dev-shortcut buttons only appear in development mode; they call the
    // server action with a pre-set email and the shared dev-password.
    await page.getByRole('button', { name: role.label }).click()
    await page.waitForURL(`${baseURL}/dashboard`)

    await context.storageState({ path: path.join(AUTH_DIR, role.file) })
    await context.close()

    console.log(`  ✓ auth state saved for ${role.name}`)
  }

  await browser.close()
}
