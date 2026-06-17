/**
 * Unit test: traceability metamodel layer order (#848)
 *
 * Value Streams sit between Strategic Initiatives and Capabilities in every
 * trace view that renders that part of the chain:
 *   Strategy → Goals → Objectives → Initiatives → Value Streams → Capabilities → Applications
 *
 * The trace views are non-exported server components, so this guards the
 * rendered section order at the source level — the cheapest deterministic guard
 * given the node-only test environment. It fails if a future change moves the
 * Value Streams layer out from between initiatives and capabilities (the #844
 * regression this issue fixes, where value streams rendered after Applications).
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

describe('traceability metamodel order (#848)', () => {
  it('Strategy trace renders Value Streams between initiatives and capabilities', () => {
    const body = viewBody('StrategyTraceView')
    const inits = labelIndex(body, 'Strategic Initiatives')
    const vs = valueStreamIndex(body)
    const caps = labelIndex(body, 'Capabilities')
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(caps).toBeGreaterThan(vs)
  })

  it('Objective trace renders Value Streams between initiatives and capabilities', () => {
    const body = viewBody('ObjectiveTraceView')
    const inits = labelIndex(body, 'Strategic Initiatives')
    const vs = valueStreamIndex(body)
    const caps = labelIndex(body, 'Capabilities')
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(caps).toBeGreaterThan(vs)
  })

  it('Capability trace renders Value Streams between initiatives and the capability anchor', () => {
    const body = viewBody('CapabilityTraceView')
    const inits = labelIndex(body, 'Strategic Initiatives')
    const vs = valueStreamIndex(body)
    const anchor = labelIndex(body, 'Capability') // anchor layer label
    expect(inits).toBeGreaterThan(-1)
    expect(vs).toBeGreaterThan(inits)
    expect(anchor).toBeGreaterThan(vs)
  })

  it('Service trace renders Value Streams above Capabilities (not stranded after Applications)', () => {
    const body = viewBody('ServiceTraceView')
    const vs = valueStreamIndex(body)
    const caps = labelIndex(body, 'Capabilities')
    const apps = labelIndex(body, 'Applications')
    expect(vs).toBeGreaterThan(-1)
    expect(caps).toBeGreaterThan(vs)
    expect(apps).toBeGreaterThan(caps)
  })

  it('chain subtitles place Value Streams between Initiatives and Capabilities', () => {
    expect(src).toContain('Initiatives → Value Streams → Capabilities')
    expect(src).toContain('Initiatives → Value Streams → Capability →')
  })
})
