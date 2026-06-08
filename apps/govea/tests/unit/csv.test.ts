/**
 * Unit tests for shared CSV helpers (#596, #604) — delimiter handling (#679).
 *
 * GovEA exports comma-delimited CSVs that use `;` *inside* multi-value fields.
 * Non-US-locale spreadsheets export `;`-delimited files; those used to import
 * as a single garbage column, failing every row with a misleading
 * `missing required field "name"`. parseCsv now sniffs the header delimiter.
 */

import { describe, it, expect } from 'vitest'
import { parseCsv, detectDelimiter, splitCsvRows } from '@/lib/csv'

describe('detectDelimiter (#679)', () => {
  it('defaults to comma for a normal header', () => {
    expect(detectDelimiter('name,description,status\n')).toBe(',')
  })

  it('detects semicolon when the header is semicolon-delimited', () => {
    expect(detectDelimiter('name;description;status\n')).toBe(';')
  })

  it('stays comma when the header has only commas, even if data rows contain ";"', () => {
    // Round-trip safety: a GovEA export puts ";" inside multi-value fields,
    // but the header itself is comma-only.
    const csv = 'name,personas\nPermit Issuance,"Clerk; Director"\n'
    expect(detectDelimiter(csv)).toBe(',')
  })

  it('picks the majority delimiter for a mixed header', () => {
    expect(detectDelimiter('name;description;full, legal name\n')).toBe(';')
  })
})

describe('parseCsv delimiter handling (#679)', () => {
  it('parses a comma-delimited file (unchanged behaviour)', () => {
    const rows = parseCsv('name,description,status\nPermit Issuance,Issue permits,published\n')
    expect(rows).toEqual([
      { name: 'Permit Issuance', description: 'Issue permits', status: 'published' },
    ])
  })

  it('parses a semicolon-delimited file instead of failing every row', () => {
    const rows = parseCsv('name;description;status\nPermit Issuance;Issue permits;published\n')
    expect(rows).toEqual([
      { name: 'Permit Issuance', description: 'Issue permits', status: 'published' },
    ])
    // Regression guard: the whole line must NOT collapse into one "name" field.
    expect(rows[0].name).toBe('Permit Issuance')
    expect(rows[0].status).toBe('published')
  })

  it('preserves ";"-separated multi-value fields in a comma-delimited file', () => {
    const rows = parseCsv('name,personas\nPermit Issuance,"Clerk; Director"\n')
    expect(rows[0].personas).toBe('Clerk; Director')
  })
})

describe('splitCsvRows delimiter param', () => {
  it('still splits on comma by default', () => {
    expect(splitCsvRows('a,b,c\n')).toEqual([['a', 'b', 'c']])
  })

  it('splits on semicolon when asked', () => {
    expect(splitCsvRows('a;b;c\n', ';')).toEqual([['a', 'b', 'c']])
  })
})
