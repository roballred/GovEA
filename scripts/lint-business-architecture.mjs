#!/usr/bin/env node
// Lint business-architecture/ persona and capability files against STYLE.md.
//
// Verifies:
//   - Persona files: H1 prefix, validation-status line, required H2 sections,
//     no forbidden headings.
//   - Capability group files: H1 prefix, required H2 sections, canonical
//     status section name.
//   - Sub-capability files: H1 prefix, required H2 sections.
//   - All files: no duplicate H2 headings.
//   - Links sections: bullet labels limited to the canonical vocabulary.
//
// Exits non-zero on any violation. Outputs a stable, grep-friendly format:
//   path:line: kind: message

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BA_ROOT = join(REPO_ROOT, 'business-architecture')

// Non-group / non-subcap reference docs that live alongside capability files
// but are intentionally excluded from the standard. STYLE.md lists no
// requirement for these.
const REFERENCE_FILES = new Set([
  'business-architecture/capabilities/orchardcore-capabilities.md',
  'business-architecture/capabilities/ea/framework-alignment/togaf-reference.md',
])

const PERSONA_REQUIRED_H2 = [
  'Role Type',
  'Who They Are',
  'Goals',
  'Pain Points',
  'Critical Insight',
  'Relevant Capabilities',
]

const PERSONA_FORBIDDEN_H2 = [
  'Most Valuable Capabilities',
]

const GROUP_REQUIRED_H2 = [
  'What It Does',
  'Personas',
  'Sub-Capabilities',
  'Success Criteria',
  'Rules',
  'Implementation Status',
  'Links',
]

const SUBCAP_REQUIRED_H2 = [
  'What It Does',
  'Personas',
  'Behaviors',
  'Rules',
  'Implementation Status',
  'Links',
]

// Non-canonical status headings explicitly called out by STYLE.md.
const STATUS_ALIASES_FORBIDDEN = [
  'Current Scope',
  'Current State',
  'Current Maturity',
]

// Canonical Links labels. Bullet body must begin with one of these followed by
// a colon (or be a continuation/nested item).
const CANONICAL_LINK_LABELS = ['Depends on:', 'Enables:', 'Related:']

const violations = []

function rec(path, line, kind, message) {
  violations.push({ path: relative(REPO_ROOT, path), line, kind, message })
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (entry.endsWith('.md')) out.push(full)
  }
  return out
}

function classify(path) {
  const rel = relative(REPO_ROOT, path).replaceAll('\\', '/')
  if (REFERENCE_FILES.has(rel)) return { kind: 'skip' }
  if (rel === 'business-architecture/STYLE.md') return { kind: 'skip' }
  if (rel.startsWith('business-architecture/personas/')) return { kind: 'persona' }
  if (rel.startsWith('business-architecture/capabilities/')) {
    const name = basename(path, '.md')
    // Architecture-decision records live in capability folders for proximity
    // but follow ADR conventions, not the sub-capability template. STYLE.md
    // notes the exemption.
    if (name.endsWith('-decision')) return { kind: 'skip' }
    const parentDir = basename(dirname(path))
    if (name === parentDir) return { kind: 'group' }
    return { kind: 'subcap' }
  }
  return { kind: 'skip' }
}

function parseHeadings(text) {
  const lines = text.split('\n')
  const headings = []
  let inCodeBlock = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    const m = line.match(/^(#{1,6})\s+(.*?)\s*$/)
    if (m) headings.push({ level: m[1].length, text: m[2], line: i + 1 })
  }
  return headings
}

function findH1(headings, path) {
  const h1s = headings.filter((h) => h.level === 1)
  if (h1s.length === 0) {
    rec(path, 1, 'structure', 'missing H1 heading')
    return null
  }
  if (h1s.length > 1) {
    for (const extra of h1s.slice(1)) {
      rec(path, extra.line, 'structure', `multiple H1 headings (extra: "${extra.text}")`)
    }
  }
  return h1s[0]
}

function checkRequiredH2(path, headings, required, kindLabel) {
  const h2Texts = headings.filter((h) => h.level === 2).map((h) => h.text)
  for (const req of required) {
    if (!h2Texts.includes(req)) {
      rec(path, 1, 'missing-section', `${kindLabel} missing required H2 "## ${req}"`)
    }
  }
}

function checkForbiddenH2(path, headings, forbidden) {
  for (const h of headings.filter((h) => h.level === 2)) {
    if (forbidden.includes(h.text)) {
      rec(path, h.line, 'forbidden-section', `H2 "## ${h.text}" is not allowed by STYLE.md`)
    }
  }
}

function checkDuplicateH2(path, headings) {
  const counts = new Map()
  for (const h of headings.filter((h) => h.level === 2)) {
    counts.set(h.text, (counts.get(h.text) ?? []).concat(h.line))
  }
  for (const [text, lines] of counts) {
    if (lines.length > 1) {
      for (const ln of lines.slice(1)) {
        rec(path, ln, 'duplicate-heading', `duplicate H2 "## ${text}" (first at line ${lines[0]})`)
      }
    }
  }
}

function checkStatusSectionName(path, headings) {
  for (const h of headings.filter((h) => h.level === 2)) {
    if (STATUS_ALIASES_FORBIDDEN.includes(h.text)) {
      rec(
        path,
        h.line,
        'status-naming',
        `status heading must be "Implementation Status" — found "${h.text}"`,
      )
    }
  }
}

// Validate that the bullets immediately inside ## Links use the canonical
// vocabulary. Continuation lines and nested bullets are ignored; only
// top-level "- " bullets are checked.
function checkLinksVocabulary(path, text, headings) {
  const lines = text.split('\n')
  const linksH2 = headings.find((h) => h.level === 2 && h.text === 'Links')
  if (!linksH2) return
  const start = linksH2.line // 1-based
  // Find end of section: next heading of any level, or EOF
  let end = lines.length
  for (const h of headings) {
    if (h.line > start && h.level <= 2) {
      end = h.line - 1
      break
    }
  }
  for (let i = start; i < end; i++) {
    const raw = lines[i]
    if (!raw) continue
    // Top-level bullet only (no leading whitespace before "- ").
    const m = raw.match(/^-\s+(.*)$/)
    if (!m) continue
    const body = m[1]
    const ok = CANONICAL_LINK_LABELS.some((label) => body.startsWith(label))
    if (!ok) {
      rec(
        path,
        i + 1,
        'link-vocabulary',
        `Links bullet must start with one of ${CANONICAL_LINK_LABELS.join(', ')}`,
      )
    }
  }
}

function checkPersonaValidationLine(path, text, h1) {
  if (!h1) return
  const lines = text.split('\n')
  // Look at lines after the H1 for the first non-empty content line.
  for (let i = h1.line; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (raw === '') continue
    const matches = /^\*\*Validation Status:\s*(Assumed|Validated)\*\*\s+—/u.test(raw)
    if (!matches) {
      rec(
        path,
        i + 1,
        'validation-status',
        'persona file must declare "**Validation Status: Assumed|Validated** — <rationale>" immediately after H1',
      )
    }
    return
  }
  rec(path, h1.line, 'validation-status', 'persona file missing Validation Status block')
}

function checkH1Prefix(path, h1, expectedPrefix) {
  if (!h1) return
  if (!h1.text.startsWith(expectedPrefix)) {
    rec(
      path,
      h1.line,
      'h1-prefix',
      `H1 must start with "${expectedPrefix}" — found "${h1.text}"`,
    )
  }
}

function lintPersona(path, text) {
  const headings = parseHeadings(text)
  const h1 = findH1(headings, path)
  checkH1Prefix(path, h1, 'Persona:')
  checkPersonaValidationLine(path, text, h1)
  checkRequiredH2(path, headings, PERSONA_REQUIRED_H2, 'persona')
  checkForbiddenH2(path, headings, PERSONA_FORBIDDEN_H2)
  checkDuplicateH2(path, headings)
}

function lintGroup(path, text) {
  const headings = parseHeadings(text)
  const h1 = findH1(headings, path)
  checkH1Prefix(path, h1, 'Capability:')
  checkRequiredH2(path, headings, GROUP_REQUIRED_H2, 'capability group')
  checkStatusSectionName(path, headings)
  checkDuplicateH2(path, headings)
  checkLinksVocabulary(path, text, headings)
}

function lintSubcap(path, text) {
  const headings = parseHeadings(text)
  const h1 = findH1(headings, path)
  checkH1Prefix(path, h1, 'Capability:')
  checkRequiredH2(path, headings, SUBCAP_REQUIRED_H2, 'sub-capability')
  checkStatusSectionName(path, headings)
  checkDuplicateH2(path, headings)
  checkLinksVocabulary(path, text, headings)
}

function main() {
  const files = walk(BA_ROOT).sort()
  for (const f of files) {
    const k = classify(f).kind
    if (k === 'skip') continue
    const text = readFileSync(f, 'utf8')
    if (k === 'persona') lintPersona(f, text)
    else if (k === 'group') lintGroup(f, text)
    else if (k === 'subcap') lintSubcap(f, text)
  }

  if (violations.length === 0) {
    console.log(`business-architecture lint: OK (${files.length} files checked)`)
    process.exit(0)
  }

  violations.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
  for (const v of violations) {
    console.log(`${v.path}:${v.line}: ${v.kind}: ${v.message}`)
  }
  console.log(`\n${violations.length} violation(s) found`)
  process.exit(1)
}

main()
