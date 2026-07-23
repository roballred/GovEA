/**
 * Unit test: traceability metamodel layer order (#848, #918, #920)
 *
 * Two guards, both at the source level (the trace views are non-exported server
 * components and the subtitle legends are computed, so this is the cheapest
 * deterministic check in the node-only test env):
 *
 *  1. Each *TraceView renders its LayerLabels in the metamodel order — e.g. Value
 *     Streams stays between Initiatives and Capabilities (the #844 regression).
 *  2. TRACE_SPINES (the single source of truth for every kind's subtitle legend,
 *     #920) orders its tokens to match the view it drives — including that the
 *     value-stream legend is its own spine, not the service one it used to fall
 *     through to.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pagePath = fileURLToPath(new URL('../../src/app/(admin)/traceability/page.tsx', import.meta.url))
const src = readFileSync(pagePath, 'utf-8')

/** Source of a single view function, from its declaration to the next one. */
function viewBody(name: string): string {
  const start = src.indexOf(`function ${name}(`)
  expect(start, `${name} should exist`).toBeGreaterThan(-1)
  const rest = src.slice(start + `function ${name}(`.length)
  const next = rest.indexOf('\nfunction ')
  return next === -1 ? rest : rest.slice(0, next)
}

/** Index of a `<LayerLabel>label</LayerLabel>` within a view body. */
function labelIndex(body: string, label: string): number {
  return body.indexOf(`<LayerLabel>${label}</LayerLabel>`)
}

/**
 * Index of the Value Streams layer, whether rendered inline (Strategy) or via
 * the shared `<ValueStreamLayer />` component (objective/capability/service).
 */
function valueStreamIndex(body: string): number {
  const inline = labelIndex(body, 'Value Streams')
  const component = body.indexOf('<ValueStreamLayer')
  const found = [inline, component].filter(i => i > -1)
  return found.length === 0 ? -1 : Math.min(...found)
}

/** The array literal text of one TRACE_SPINES row (e.g. spine('capability')). */
function spine(kind: string): string {
  const mapStart = src.indexOf('const TRACE_SPINES')
  expect(mapStart, 'TRACE_SPINES should exist').toBeGreaterThan(-1)
  const map = src.slice(mapStart, src.indexOf('\n}', mapStart))
  const keyToken = kind.includes('-') ? `'${kind}':` : `${kind}:`
  const keyIdx = map.indexOf(keyToken)
  expect(keyIdx, `${kind} spine should exist in TRACE_SPINES`).toBeGreaterThan(-1)
  const rowStart = map.indexOf('[', keyIdx)
  return map.slice(rowStart, map.indexOf(']', rowStart))
}

/** Index of a quoted spine token — exact, so 'Service' ≠ 'Services'. */
function order(row: string, token: string): number {
  return row.indexOf(`'${token}'`)
}

describe('traceability metamodel order (#848, #918, #920)', () => {
  // ── 1. View section order ──────────────────────────────────────────────────

  it('Strategy view renders Value Streams between initiatives and capabilities', () => {
    const body = viewBody('StrategyTraceView')
    const inits = labelIndex(body, 'Strategic Initiatives')
    const vs = valueStreamIndex(body)
    const caps = labelIndex(body, 'Capabilities')
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(caps).toBeGreaterThan(vs)
  })

  it('Objective view renders Value Streams between initiatives and capabilities', () => {
    const body = viewBody('ObjectiveTraceView')
    const inits = labelIndex(body, 'Strategic Initiatives')
    const vs = valueStreamIndex(body)
    const caps = labelIndex(body, 'Capabilities')
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(caps).toBeGreaterThan(vs)
  })

  it('Capability view renders Initiatives → Value Streams → Personas → anchor (#918)', () => {
    const body = viewBody('CapabilityTraceView')
    const inits = labelIndex(body, 'Initiatives')
    const vs = valueStreamIndex(body)
    const personas = labelIndex(body, 'Personas')
    const anchor = labelIndex(body, 'Capability') // anchor layer label
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(personas).toBeGreaterThan(vs)
    expect(anchor).toBeGreaterThan(personas)
  })

  it('Service view renders Value Streams above Capabilities above Applications', () => {
    const body = viewBody('ServiceTraceView')
    const vs = valueStreamIndex(body)
    const caps = labelIndex(body, 'Capabilities')
    const apps = labelIndex(body, 'Applications')
    expect(vs).toBeGreaterThan(-1)
    expect(caps).toBeGreaterThan(vs)
    expect(apps).toBeGreaterThan(caps)
  })

  it('Value-stream view renders Objectives → Services → anchor → Stakeholders → Stages → Applications', () => {
    const body = viewBody('ValueStreamTraceView')
    const objectives = labelIndex(body, 'Strategic Objectives')
    const services = labelIndex(body, 'Services')
    const anchor = labelIndex(body, 'Value Stream') // exact: not 'Value Streams'
    const stakeholders = labelIndex(body, 'Stakeholders')
    const stages = labelIndex(body, 'Stages')
    const apps = labelIndex(body, 'Applications')
    expect(objectives).toBeGreaterThan(-1)
    expect(services).toBeGreaterThan(objectives)
    expect(anchor).toBeGreaterThan(services)
    expect(stakeholders).toBeGreaterThan(anchor)
    expect(stages).toBeGreaterThan(stakeholders)
    expect(apps).toBeGreaterThan(stages)
  })

  // ── 2. Legend spine order (TRACE_SPINES, the subtitle source of truth) ──────

  it('every trace kind has a spine that ends in Applications', () => {
    for (const kind of ['strategy', 'goal', 'objective', 'capability', 'service', 'value-stream']) {
      expect(order(spine(kind), 'Applications'), `${kind} spine ends in Applications`).toBeGreaterThan(-1)
    }
  })

  it('strategy & objective spines place Value Streams between Initiatives and Capabilities', () => {
    for (const kind of ['strategy', 'objective']) {
      const row = spine(kind)
      const inits = order(row, 'Initiatives')
      const vs = order(row, 'Value Streams')
      const caps = order(row, 'Capabilities')
      expect(inits, `${kind} has Initiatives`).toBeGreaterThan(-1)
      expect(vs).toBeGreaterThan(inits)
      expect(caps).toBeGreaterThan(vs)
    }
  })

  it('capability spine orders Initiatives → Value Streams → Personas → Capability (#918)', () => {
    const row = spine('capability')
    const inits = order(row, 'Initiatives')
    const vs = order(row, 'Value Streams')
    const personas = order(row, 'Personas')
    const anchor = order(row, 'Capability')
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(personas).toBeGreaterThan(vs)
    expect(anchor).toBeGreaterThan(personas)
  })

  it('value-stream legend is its own spine, not the service one (#920)', () => {
    const row = spine('value-stream')
    const objectives = order(row, 'Objectives')
    const services = order(row, 'Services')
    const anchor = order(row, 'Value Stream')
    const stakeholders = order(row, 'Stakeholders')
    const stages = order(row, 'Stages')
    const apps = order(row, 'Applications')
    expect(objectives).toBeGreaterThan(-1)
    expect(services).toBeGreaterThan(objectives)
    expect(anchor).toBeGreaterThan(services)
    expect(stakeholders).toBeGreaterThan(anchor)
    expect(stages).toBeGreaterThan(stakeholders)
    expect(apps).toBeGreaterThan(stages)
    // Guard against the old fall-through: value-stream must not carry the
    // service anchor as a spine token.
    expect(order(row, 'Service')).toBe(-1)
  })
})
