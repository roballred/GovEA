/**
 * Lock in the architecture from #412.
 *
 * The helpers (flagLinksForVisibilityDrop, clearLinksFlag,
 * removeLinksForConnection) MUST live in lib/ — not actions/ — so they
 * cannot be reached as 'use server' RPC endpoints. If a future change
 * re-exports them from actions/, this test fails.
 */
import { vi, describe, it, expect } from 'vitest'

// auth() is mocked because importing actions/cross-org-links transitively
// pulls in next-auth, which has Node-only resolution that breaks in vitest
// without a mock. We never call auth() in this file — the mock only exists
// to keep the import graph happy.
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('cross-org-link-helpers placement (#412)', () => {
  it('helpers are exported from lib/cross-org-link-helpers', async () => {
    const lib = await import('@/lib/cross-org-link-helpers')
    expect(typeof lib.flagLinksForVisibilityDrop).toBe('function')
    expect(typeof lib.clearLinksFlag).toBe('function')
    expect(typeof lib.removeLinksForConnection).toBe('function')
  })

  it('actions/cross-org-links no longer exports the helpers', async () => {
    const actions = await import('@/actions/cross-org-links')
    // 'use server' RPC modules must NOT expose internal helpers — the helpers
    // would otherwise become network-callable endpoints.
    expect(actions).not.toHaveProperty('flagLinksForVisibilityDrop')
    expect(actions).not.toHaveProperty('clearLinksFlag')
    expect(actions).not.toHaveProperty('removeLinksForConnection')
  })
})
