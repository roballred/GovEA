/**
 * Unit tests for URL validation utilities (#272)
 *
 * validateWebUrl — write-time sanitisation (throws on bad input)
 * isSafeUrl      — render-time boolean guard (never throws)
 */

import { describe, it, expect } from 'vitest'
import { validateWebUrl, isSafeUrl } from '@/lib/url'

// ---------------------------------------------------------------------------
// validateWebUrl
// ---------------------------------------------------------------------------

describe('validateWebUrl', () => {
  describe('safe schemes — returns canonical href', () => {
    it('accepts https URL', () => {
      expect(validateWebUrl('https://example.com')).toBe('https://example.com/')
    })

    it('accepts http URL', () => {
      expect(validateWebUrl('http://example.com/path')).toBe('http://example.com/path')
    })

    it('trims whitespace before parsing', () => {
      expect(validateWebUrl('  https://example.com  ')).toBe('https://example.com/')
    })

    it('preserves query string and fragment', () => {
      const url = 'https://example.com/page?q=1#section'
      expect(validateWebUrl(url)).toBe(url)
    })
  })

  describe('empty / null input — returns null (field is optional)', () => {
    it('returns null for null', () => {
      expect(validateWebUrl(null)).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(validateWebUrl(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(validateWebUrl('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(validateWebUrl('   ')).toBeNull()
    })
  })

  describe('unsafe schemes — throws user-facing error', () => {
    it('rejects javascript:', () => {
      expect(() => validateWebUrl('javascript:alert(1)')).toThrow(/not allowed/)
    })

    it('rejects data:', () => {
      expect(() => validateWebUrl('data:text/html,<script>alert(1)</script>')).toThrow(/not allowed/)
    })

    it('rejects ftp:', () => {
      expect(() => validateWebUrl('ftp://files.example.com')).toThrow(/not allowed/)
    })

    it('rejects vbscript:', () => {
      expect(() => validateWebUrl('vbscript:msgbox(1)')).toThrow(/not allowed/)
    })
  })

  describe('malformed URLs — throws user-facing error', () => {
    it('rejects bare text', () => {
      expect(() => validateWebUrl('not a url')).toThrow(/not a valid URL/)
    })

    it('rejects missing scheme', () => {
      expect(() => validateWebUrl('example.com')).toThrow(/not a valid URL/)
    })
  })
})

// ---------------------------------------------------------------------------
// isSafeUrl
// ---------------------------------------------------------------------------

describe('isSafeUrl', () => {
  it('returns true for https URL', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
  })

  it('returns true for http URL', () => {
    expect(isSafeUrl('http://example.com')).toBe(true)
  })

  it('returns false for javascript: URL', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  })

  it('returns false for data: URL', () => {
    expect(isSafeUrl('data:text/html,hi')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSafeUrl(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSafeUrl(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSafeUrl('')).toBe(false)
  })

  it('returns false for malformed string (never throws)', () => {
    expect(isSafeUrl('not-a-url')).toBe(false)
  })
})
