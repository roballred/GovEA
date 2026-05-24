// Shared CSV helpers for per-entity import/export under #596.
//
// `splitCsvRows` is the quote-aware row splitter introduced in #604 to survive
// multi-line cells (capability `behaviors` / `rules`, ADR `context` / `decision`
// / `consequences`, etc.) through an Export → Import round-trip.

export function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function splitCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
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
  const rows = splitCsvRows(text)
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(values =>
    Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  )
}

export function splitSemicolonList(value: string | undefined): string[] {
  return (value || '').split(/;|\n/).map(s => s.trim()).filter(Boolean)
}
