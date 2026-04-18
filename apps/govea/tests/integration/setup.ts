/**
 * Vitest global setup for integration tests.
 *
 * Mocks all Next.js server-only APIs so server actions can be imported
 * and exercised directly without a running Next.js server.
 *
 * DATABASE_URL is loaded from .env.local at the top of this file so the
 * vitest binary can be invoked directly without `node --env-file`.
 * Tests hit the real dev database using org-scoped factories for isolation;
 * each test suite creates a unique org and cleans up in afterAll.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi } from 'vitest'

// Load .env.local if DATABASE_URL is not already set (e.g. in CI)
if (!process.env.DATABASE_URL) {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local not present — DATABASE_URL must be set in the environment
  }
}

// ── Next.js navigation ────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { digest: 'NEXT_REDIRECT' })
  },
  notFound: () => {
    throw Object.assign(new Error('NOT_FOUND'), { digest: 'NEXT_NOT_FOUND' })
  },
}))

// ── Next.js cache ─────────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}))

// ── Next.js headers (cookies / headers) ──────────────────────────────────────
vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => null, set: vi.fn(), delete: vi.fn() }),
  headers: () => new Headers(),
}))
