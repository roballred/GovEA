/**
 * Unit tests for the duplicate-detection heuristic (#538).
 *
 * The actual report integrates with the DB; here we exercise the pure
 * tokenize + jaccard pieces so the heuristic can be tuned without spinning
 * up Postgres.
 */
import { describe, it, expect } from 'vitest'
import { _testing } from '@/lib/enterprise-view'

const { tokenize, jaccard, JACCARD_THRESHOLD, NAME_STOPWORDS } = _testing

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumeric', () => {
    expect(Array.from(tokenize('Permit Issuance')).sort()).toEqual(['issuance', 'permit'])
  })

  it('drops tokens shorter than 3 chars (avoids "a", "to", "id")', () => {
    expect(Array.from(tokenize('GIS Mapping')).sort()).toEqual(['gis', 'mapping'])
    expect(Array.from(tokenize('Pay Tax')).sort()).toEqual(['pay', 'tax'])
    expect(Array.from(tokenize('Add a Tag')).sort()).toEqual(['add', 'tag'])
  })

  it('drops stopwords', () => {
    expect(Array.from(tokenize('Capability Management System')).sort()).toEqual([])
    expect(Array.from(tokenize('Permit Management System')).sort()).toEqual(['permit'])
  })

  it('handles punctuation', () => {
    expect(Array.from(tokenize("Driver's Licence")).sort()).toEqual(['driver', 'licence'])
    expect(Array.from(tokenize('License & Permit Management')).sort()).toEqual(['license', 'permit'])
  })

  it('returns an empty set for empty input', () => {
    expect(tokenize('').size).toBe(0)
    expect(tokenize('   ').size).toBe(0)
  })

  it('stopword list rejects the documented terms', () => {
    expect(NAME_STOPWORDS.has('management')).toBe(true)
    expect(NAME_STOPWORDS.has('system')).toBe(true)
    expect(NAME_STOPWORDS.has('service')).toBe(true)
    expect(NAME_STOPWORDS.has('capability')).toBe(true)
  })
})

describe('jaccard', () => {
  it('is 1 when sets are identical', () => {
    expect(jaccard(tokenize('Permit Issuance'), tokenize('Permit Issuance'))).toBe(1)
  })

  it('is 0 when sets are disjoint', () => {
    expect(jaccard(tokenize('Permit Issuance'), tokenize('Budget Reporting'))).toBe(0)
  })

  it('is 0 when one set is empty', () => {
    expect(jaccard(tokenize(''), tokenize('Permit Issuance'))).toBe(0)
    expect(jaccard(tokenize('Capability System'), tokenize('Permit Issuance'))).toBe(0) // first all-stopwords
  })

  it('partial overlap returns intersection-over-union', () => {
    // "Permit Issuance" → {permit, issuance}
    // "Permit Management" → {permit} (management is a stopword)
    // intersection = {permit}, union = {permit, issuance} → 1/2
    expect(jaccard(tokenize('Permit Issuance'), tokenize('Permit Management'))).toBeCloseTo(0.5, 5)
  })

  it('three-way candidate cluster behaves sensibly', () => {
    const a = tokenize('Permit Issuance')
    const b = tokenize('Permitting')                    // single token, no overlap with "permit issuance" — "permitting" ≠ "permit"
    const c = tokenize('License & Permit Management')
    expect(jaccard(a, b)).toBe(0)
    expect(jaccard(a, c)).toBeGreaterThan(0)
    expect(jaccard(b, c)).toBe(0)
  })
})

describe('threshold', () => {
  it('matches the documented value', () => {
    expect(JACCARD_THRESHOLD).toBeGreaterThanOrEqual(0.25)
    expect(JACCARD_THRESHOLD).toBeLessThan(0.5)
  })

  it('flags meaningful real-world pairs above the threshold', () => {
    // "Good catch" cases the report should surface.
    expect(jaccard(tokenize('Identity & Authentication'), tokenize('Digital Identity')))
      .toBeGreaterThanOrEqual(JACCARD_THRESHOLD)  // 1/3
    expect(jaccard(tokenize('Online Permitting'), tokenize('Permitting & Licensing System')))
      .toBeGreaterThanOrEqual(JACCARD_THRESHOLD)  // 1/3
    expect(jaccard(tokenize('Permit Issuance'), tokenize('Permit Issuance Hub')))
      .toBeGreaterThanOrEqual(JACCARD_THRESHOLD)  // 2/3
  })

  it('does NOT flag unrelated capabilities sharing only a stopword', () => {
    // Both have "Management" (stopword) — should not be flagged as duplicates.
    expect(jaccard(tokenize('Budget Management'), tokenize('Permit Management'))).toBe(0)
  })

  it('demonstrates a known gap: no stemming or lemmatisation', () => {
    // "request" vs "requests" do not match — pinned here so the limit is
    // explicit. Future improvement: lightweight stemming.
    expect(jaccard(tokenize('Service Request Management'), tokenize('Service Requests')))
      .toBeLessThan(JACCARD_THRESHOLD)
  })
})
