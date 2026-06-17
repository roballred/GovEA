/**
 * Integration tests: glossary active-reference-source selection (#837)
 *
 * A glossary term may carry several saved reference/source definitions; exactly
 * one can be the active source, populating `definitionSource` /
 * `definitionSourceUrl` on the term. These tests exercise the server action that
 * persists that choice (editGlossaryTerm), covering: selecting a saved source,
 * preserving the saved sources while doing so, clearing the active source,
 * role enforcement, terms with no sources, and audit capture of the change.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { glossaryTerms, glossaryTermSources } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createGlossaryTerm, editGlossaryTerm } from '@/actions/glossary'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, getAuditLogs, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const SOURCES = [
  { name: 'TOGAF 10', url: 'https://www.opengroup.org/togaf', definition: 'A business or technical capability.' },
  // Path-bearing URL: validateWebUrl normalizes a bare host to a trailing slash,
  // so use a stable path so the round-trip equals the input exactly.
  { name: 'NIST SP 800-145', url: 'https://csrc.nist.gov/pubs/sp/800/145/final', definition: 'On-demand network access to shared resources.' },
]

describe('glossary active-source selection (#837)', () => {
  let orgId: string
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })
  afterAll(() => cleanupOrg(orgId))

  async function termRow(term: string) {
    const [r] = await db.select().from(glossaryTerms)
      .where(and(eq(glossaryTerms.organizationId, orgId), eq(glossaryTerms.term, term)))
    return r
  }
  async function sourceCount(termId: string) {
    const rows = await db.select().from(glossaryTermSources).where(eq(glossaryTermSources.termId, termId))
    return rows.length
  }

  it('selects a saved source as active and preserves the saved sources', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))

    // Create a term with two saved sources and no active source yet.
    await createGlossaryTerm(form({
      term: 'Capability',
      definition: 'A particular ability the organization possesses.',
      status: 'published', visibility: 'org',
      sources: JSON.stringify(SOURCES),
    }))
    const created = await termRow('Capability')
    expect(created.definitionSource).toBeNull()
    expect(await sourceCount(created.id)).toBe(2)

    // Select the second saved source as active. `sources` is omitted, so the
    // saved sources must be preserved untouched.
    await editGlossaryTerm(created.id, form({
      term: 'Capability',
      definition: 'A particular ability the organization possesses.',
      status: 'published', visibility: 'org',
      definitionSource: SOURCES[1].name,
      definitionSourceUrl: SOURCES[1].url,
    }))

    const updated = await termRow('Capability')
    expect(updated.definitionSource).toBe(SOURCES[1].name)
    expect(updated.definitionSourceUrl).toBe(SOURCES[1].url)
    expect(await sourceCount(updated.id)).toBe(2)
  })

  it('records the active-source change in the audit log', async () => {
    const logs = await getAuditLogs(orgId, 'glossary.edit')
    const term = await termRow('Capability')
    const entry = logs.find(l => l.entityId === term.id)
    expect(entry).toBeDefined()
    expect((entry!.after as { definitionSource?: string }).definitionSource).toBe('NIST SP 800-145')
  })

  it('clears the active source back to none', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const term = await termRow('Capability')
    await editGlossaryTerm(term.id, form({
      term: 'Capability',
      definition: 'A particular ability the organization possesses.',
      status: 'published', visibility: 'org',
      definitionSource: '',
      definitionSourceUrl: '',
    }))
    const cleared = await termRow('Capability')
    expect(cleared.definitionSource).toBeNull()
    expect(cleared.definitionSourceUrl).toBeNull()
  })

  it('saves cleanly for a term that has no sources', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    await createGlossaryTerm(form({
      term: 'Service',
      definition: 'A repeatable activity that delivers value.',
      status: 'draft', visibility: 'org',
    }))
    const term = await termRow('Service')
    expect(await sourceCount(term.id)).toBe(0)

    await editGlossaryTerm(term.id, form({
      term: 'Service',
      definition: 'A repeatable activity that delivers value.',
      status: 'draft', visibility: 'org',
      definitionSource: '',
      definitionSourceUrl: '',
    }))
    const after = await termRow('Service')
    expect(after.definitionSource).toBeNull()
  })

  it('rejects a viewer', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const term = await termRow('Capability')
    await expect(editGlossaryTerm(term.id, form({
      term: 'Capability',
      definition: 'A particular ability the organization possesses.',
      status: 'published', visibility: 'org',
      definitionSource: 'TOGAF 10',
    }))).rejects.toThrow('Forbidden')
  })

  // #849 — using a saved source as the term definition persists the source's
  // definition text AND its attribution together (the UI couples these via the
  // "Use this source's definition" action on GlossarySourceSelect).
  it('persists a saved source as the term definition together with its attribution', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    const term = await termRow('Capability')

    await editGlossaryTerm(term.id, form({
      term: 'Capability',
      definition: SOURCES[0].definition,        // source text used as the definition
      status: 'published', visibility: 'org',
      definitionSource: SOURCES[0].name,         // matching attribution
      definitionSourceUrl: SOURCES[0].url,
    }))

    const updated = await termRow('Capability')
    expect(updated.definition).toBe(SOURCES[0].definition)
    expect(updated.definitionSource).toBe(SOURCES[0].name)
    expect(updated.definitionSourceUrl).toBe(SOURCES[0].url)
  })
})
