/**
 * Unit tests for definitionForSourceSelection (#849).
 *
 * This is the coupling that regressed three times (#837 → #839 → #851 → #852):
 * selecting an active reference source must populate the term definition with
 * that source's text. The behavior lives in a pure function so both edit
 * surfaces share it and it can be covered in the node-only test env (there is no
 * jsdom/component-render setup).
 *
 * Capability: po-glossary, cm-content-authoring
 */
import { describe, it, expect } from 'vitest'
import { definitionForSourceSelection, initialSourceSelection, type GlossarySourceOption } from '@/components/glossary-source-select'

const SOURCES: GlossarySourceOption[] = [
  { name: 'TOGAF 10', url: 'https://www.opengroup.org/togaf', definition: 'A business or technical capability.' },
  { name: 'NIST SP 800-145', url: 'https://csrc.nist.gov/pubs/sp/800/145/final', definition: 'On-demand network access to shared resources.' },
  { name: 'Name only', url: '', definition: '' }, // saved source with no definition text
]

const CUSTOM = '__custom__'
const NONE = ''

describe('definitionForSourceSelection (#849)', () => {
  it('adopts the selected saved source definition text', () => {
    expect(definitionForSourceSelection('TOGAF 10', SOURCES, 'old text'))
      .toBe('A business or technical capability.')
    expect(definitionForSourceSelection('NIST SP 800-145', SOURCES, 'old text'))
      .toBe('On-demand network access to shared resources.')
  })

  it('leaves the current definition untouched for "None"', () => {
    expect(definitionForSourceSelection(NONE, SOURCES, 'my original definition'))
      .toBe('my original definition')
  })

  it('leaves the current definition untouched for "Custom source"', () => {
    expect(definitionForSourceSelection(CUSTOM, SOURCES, 'my custom definition'))
      .toBe('my custom definition')
  })

  it('leaves the current definition untouched for a saved source with no definition text', () => {
    expect(definitionForSourceSelection('Name only', SOURCES, 'keep me'))
      .toBe('keep me')
  })

  it('leaves the current definition untouched for an unknown selection', () => {
    expect(definitionForSourceSelection('Renamed away', SOURCES, 'keep me'))
      .toBe('keep me')
  })

  it('selecting a source then switching to None preserves the adopted text', () => {
    // Simulates the dropdown flow: pick a source (adopts text), then pick None
    // (attribution clears, but the definition the editor adopted stays).
    const adopted = definitionForSourceSelection('TOGAF 10', SOURCES, '')
    expect(adopted).toBe('A business or technical capability.')
    expect(definitionForSourceSelection(NONE, SOURCES, adopted)).toBe(adopted)
  })
})

// Guards the selection-state helper the edit surfaces use to seed the dropdown,
// so attribution and the definition coupling start from a consistent value.
describe('initialSourceSelection', () => {
  const names = SOURCES.map(s => s.name)

  it('returns the saved source name when the attribution matches one', () => {
    expect(initialSourceSelection('TOGAF 10', names)).toBe('TOGAF 10')
  })

  it('returns CUSTOM for free-text attribution that matches no saved source', () => {
    expect(initialSourceSelection('Some Book, p.42', names)).toBe(CUSTOM)
  })

  it('returns NONE when there is no attribution', () => {
    expect(initialSourceSelection(null, names)).toBe(NONE)
    expect(initialSourceSelection('', names)).toBe(NONE)
  })
})
