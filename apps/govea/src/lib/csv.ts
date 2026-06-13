// Shared CSV helpers for per-entity import/export under #596.
//
// `splitCsvRows` is the quote-aware row splitter introduced in #604 to survive
// multi-line cells (capability `behaviors` / `rules`, ADR `context` / `decision`
// / `consequences`, etc.) through an Export → Import round-trip.

// #763 — CSV formula injection (CWE-1236). A cell whose value begins with
// =, +, -, or @ is interpreted as a formula by Excel / Google Sheets / LibreOffice
// when the exported file is opened, so attacker-influenced content in a
// contributor-editable field (e.g. `=HYPERLINK(...)`, `=cmd|'/c calc'!A1`)
// could execute on a reader's machine. The standard neutralization is to
// prefix a single quote, which spreadsheets render as "treat the rest as
// literal text" and do not display. `parseCsv` strips it back on import so the
// Export→Import round-trip is lossless. Tab/CR (\t, \r) are also formula
// triggers but cannot appear at a cell start here: \r is consumed as a row
// terminator by the splitter, and a leading \t would be trimmed by parseCsv.
const FORMULA_TRIGGERS = ['=', '+', '-', '@']

export function neutralizeFormula(val: string): string {
  return val.length > 0 && FORMULA_TRIGGERS.includes(val[0]) ? `'${val}` : val
}

/** Reverse of neutralizeFormula — strips the guarding quote on import. */
export function denormalizeFormula(val: string): string {
  return val.length > 1 && val[0] === "'" && FORMULA_TRIGGERS.includes(val[1])
    ? val.slice(1)
    : val
}

export function escapeCsv(val: string): string {
  const safe = neutralizeFormula(val)
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

/**
 * Detects the field delimiter from the header line (#679). GovEA exports
 * comma-delimited CSVs, but uses `;` *inside* multi-value fields (e.g. persona
 * lists, via `splitSemicolonList`). Spreadsheets in many non-US locales
 * (notably Excel across much of Europe) export `;`-delimited files instead;
 * those previously imported as a single garbage column, failing every row with
 * a misleading `missing required field "name"`.
 *
 * We sniff only the *header* line — which never contains multi-value list
 * values — and choose whichever of `,` / `;` appears more often. This means a
 * normal comma file with `;` inside data rows is unaffected (the header has
 * commas, no semicolons), preserving the Export→Import round-trip, while a
 * genuinely semicolon-delimited file is parsed correctly. Ties and the common
 * case default to comma.
 */
export function detectDelimiter(text: string): ',' | ';' {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  const commas = (header.match(/,/g) || []).length
  const semicolons = (header.match(/;/g) || []).length
  return semicolons > commas ? ';' : ','
}

export function splitCsvRows(text: string, delimiter: ',' | ';' = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      row.push(field); field = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(c => c.length > 0)) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some(c => c.length > 0)) rows.push(row)
  }
  return rows
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsvRows(text, detectDelimiter(text))
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(values =>
    // #763 — strip the formula-guarding quote escapeCsv added on export so the
    // round-trip is lossless. Trim first: a quoted "  =x" keeps its inner
    // spaces through the splitter, and the guard sits at the trimmed start.
    Object.fromEntries(headers.map((h, i) => [h, denormalizeFormula((values[i] ?? '').trim())]))
  )
}

export function splitSemicolonList(value: string | undefined): string[] {
  return (value || '').split(/;|\n/).map(s => s.trim()).filter(Boolean)
}
