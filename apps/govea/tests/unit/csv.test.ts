/**
 * Unit tests for shared CSV helpers (#596, #604) — delimiter handling (#679).
 *
 * GovEA exports comma-delimited CSVs that use `;` *inside* multi-value fields.
 * Non-US-locale spreadsheets export `;`-delimited files; those used to import
 * as a single garbage column, failing every row with a misleading
 * `missing required field "name"`. parseCsv now sniffs the header delimiter.
 */

import { describe, it, expect } from 'vitest'
import { parseCsv, detectDelimiter, splitCsvRows, escapeCsv, neutralizeFormula } from '@/lib/csv'

describe('CSV formula injection neutralization (#763)', () => {
  it.each(['=SUM(A1:A9)', '+1+1', '-2+3', '@SUM(A1)'])(
    'prefixes a guarding quote on cells starting with a formula trigger: %s',
    val => {
      expect(escapeCsv(val)).toBe(`'${val}`)
    },
  )

  it('neutralizes the classic DDE payload', () => {
    expect(escapeCsv('=cmd|\'/c calc\'!A1')).toBe("'=cmd|'/c calc'!A1")
  })

  it('neutralizes AND quotes a formula payload that contains commas/quotes', () => {
    // Guard quote added first, then CSV-quoted because of the embedded comma.
    expect(escapeCsv('=HYPERLINK("http://evil","x")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""x"")"',
    )
  })

  it('leaves ordinary values untouched', () => {
    for (const val of ['Permit Issuance', 'published', '12 Main St', 'a-b-c', 'x=y']) {
      expect(escapeCsv(val)).toBe(val)
    }
  })

  it('still quotes a neutralized cell that also needs quoting', () => {
    // Leading '=' (neutralized) plus an embedded comma (must be quoted).
    expect(escapeCsv('=A1,B2')).toBe('"\'=A1,B2"')
  })

  it('round-trips formula-leading values losslessly through export → import', () => {
    const original = [
      { name: 'Normal', note: '=SUM(A1)' },
      { name: '-Dash lead', note: '@at lead' },
      { name: 'Plain', note: 'nothing special' },
    ]
    const header = 'name,note'
    const body = original.map(r => `${escapeCsv(r.name)},${escapeCsv(r.note)}`).join('\n')
    const parsed = parseCsv(`${header}\n${body}\n`)
    expect(parsed).toEqual(original)
  })

  it('does not strip a legitimate leading quote that is not a formula guard', () => {
    // "'tis" — apostrophe not followed by a trigger char — must survive import.
    const parsed = parseCsv(`name\n${escapeCsv("'tis a quote")}\n`)
    expect(parsed[0].name).toBe("'tis a quote")
  })

  it('neutralizeFormula handles empty strings without indexing undefined', () => {
    expect(neutralizeFormula('')).toBe('')
  })
})

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
