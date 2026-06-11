/**
 * Unit tests for the post-logout resurrection guard (#782).
 *
 * isResurrectedSession decides, in middleware, whether a presented session
 * token must be rejected because the browser signed out after it was minted.
 */

import { describe, it, expect } from 'vitest'
import {
  isResurrectedSession,
  RESURRECTION_WINDOW_MS,
  LOGGED_OUT_MARKER_MAX_AGE_S,
} from '@/lib/logout-marker'

const T = 1_750_000_000_000 // marker: logged out at this epoch ms

describe('isResurrectedSession', () => {
  it('no marker → never resurrected', () => {
    expect(isResurrectedSession(undefined, T / 1000)).toBe(false)
  })

  it('token minted before the marker → resurrected', () => {
    expect(isResurrectedSession(String(T), (T - 5_000) / 1000)).toBe(true)
  })

  it('token minted within the race window after the marker → resurrected', () => {
    // Genuine re-logins are exempt by construction, not timing: events.signIn
    // deletes the marker, so a marker coexisting with a recent token means a
    // late-landing roll (or a failed marker deletion, which self-heals).
    const iatMs = T + RESURRECTION_WINDOW_MS - 1
    expect(isResurrectedSession(String(T), iatMs / 1000)).toBe(true)
  })

  it('token minted after the window (failed marker deletion, healed) → accepted', () => {
    const iatMs = T + RESURRECTION_WINDOW_MS + 1_000
    expect(isResurrectedSession(String(T), iatMs / 1000)).toBe(false)
  })

  it('token with no iat alongside a marker → resurrected (indistinguishable)', () => {
    expect(isResurrectedSession(String(T), undefined)).toBe(true)
  })

  it('corrupt marker fails open — does not lock the browser out', () => {
    expect(isResurrectedSession('not-a-number', (T - 5_000) / 1000)).toBe(false)
    expect(isResurrectedSession('', (T - 5_000) / 1000)).toBe(false)
    expect(isResurrectedSession('-1', (T - 5_000) / 1000)).toBe(false)
  })

  it('marker lifetime covers the full session maxAge (auth.config.ts)', () => {
    // If the session maxAge ever grows past the marker lifetime, a
    // pre-logout token could outlive the marker and resurrect late.
    const sessionMaxAgeS = 60 * 60 * 24 // mirrors auth.config.ts session.maxAge
    expect(LOGGED_OUT_MARKER_MAX_AGE_S).toBeGreaterThanOrEqual(sessionMaxAgeS)
  })
})
