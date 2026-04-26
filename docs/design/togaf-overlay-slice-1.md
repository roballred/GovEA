# TOGAF Overlay — First Implementation Slice

**Issue:** [#245](https://github.com/roballred/GovEA/issues/245)
**Status:** Scoped, not yet implemented

---

## Chosen slice

**Framework mapping on capabilities + Application Landscape report.**

Both ship together. Framework mapping alone produces no visible output. A report alone just re-presents existing content with TOGAF headers. Together they demonstrate the full overlay concept: an architect maps records, the report consumes those mappings, unmapped records surface as gaps.

---

## Why Application Landscape as the first report

Four sub-capabilities in this group could each produce a report. Application Landscape is the right first one:

- GovEA's application portfolio is its richest structured dataset (lifecycle status, vendor, capability links, objective traceability all exist today)
- Unmapped apps appear as gaps, which creates a visible reason to use the mapping feature
- A Department Director can read the output without TOGAF training — "Finance applications" is legible; "Application Architecture Domain" doesn't have to appear in their view
- Capability map reports are partially served by the relationship visualization already built (#281)
- Architecture Vision requires heavy narrative fields that are often empty; it's the wrong first slice

---

## What is NOT in this slice

| Item | Reason |
|------|--------|
| Mapping UI on application, ADR, or principle detail pages | Scope — capability mapping is enough to prove the concept |
| ADM phase alignment | Separate sub-capability, follow-on |
| Architecture Vision report | Requires narrative fields; too opaque without TOGAF training |
| Standards & Principles TOGAF report | Follow-on |
| Migration / Roadmap TOGAF report | Follow-on |
| Framework Reference Management UI | `glossary_term_sources` is the near-term analog; a dedicated surface is follow-on |
| Cross-org framework mappings | Follow-on |

---

## Schema

One new table. No changes to existing tables.

```sql
-- framework_mappings
id              uuid primary key default gen_random_uuid()
organization_id uuid not null references organizations(id) on delete cascade
entity_type     text not null        -- 'capability' | 'application' | 'adr' | 'principle' (extensible)
entity_id       uuid not null
framework       text not null        -- 'togaf' (extensible)
concept_label   text not null        -- controlled vocabulary per framework (see below)
rationale       text                 -- optional: why this mapping exists
created_by      uuid references users(id)
created_at      timestamp not null default now()
updated_at      timestamp not null default now()
```

**TOGAF concept labels for v1 (Architecture Domains):**

| Label | Meaning |
|-------|---------|
| `Business Architecture` | Capabilities, personas, services, value streams |
| `Application Architecture` | Applications, application portfolio |
| `Technology Architecture` | Infrastructure, platforms (future) |
| `Data Architecture` | Data assets, information flows (future) |

These four are the TOGAF Architecture Domains from the Architecture Content Framework. They are the most universally recognized TOGAF concept and require no TOGAF expertise to understand when used as grouping labels.

No unique constraint on `(organization_id, entity_type, entity_id, concept_label)` — a record can map to multiple domains in unusual cases, and the rationale field distinguishes them.

**Index:** `(organization_id, entity_type, entity_id)` for fast lookup on detail pages.

---

## Module flag

Add `'framework-overlay'` to `ModuleKey` in `src/lib/modules.ts`.

**Critical difference from all other modules:** framework overlay must default to **OFF**. Every other module uses `enabledModules[key] !== false` (absent = on). Framework overlay must use `enabledModules['framework-overlay'] === true` (absent = off).

This means:
- Existing orgs see no change until an admin explicitly enables it
- New orgs get it off by default
- The `isModuleEnabled` helper cannot be used for this key without modification

Options:
1. Add a second helper `isOverlayEnabled(enabledModules, key)` that uses `=== true` semantics
2. Extend `MODULE_DEFS` with a `defaultOn: boolean` field and update `isModuleEnabled` to respect it
3. Check `enabledModules['framework-overlay'] === true` inline at each call site

**Recommendation:** Option 2. Extend `ModuleDef` with `defaultOn: boolean` (default `true` to preserve existing behavior), set `defaultOn: false` for `framework-overlay`, update `isModuleEnabled` accordingly. One clean change, no new helper needed, existing modules unaffected.

---

## Feature flag in settings UI

Add a "Framework Alignment" section to the org settings page, after the Modules section. Single toggle: "Enable TOGAF framework overlay." When on, the mapping panels and report routes become available to editors and admins. Disabled by default.

Same toggle pattern as existing module toggles.

---

## Framework mapping UI

**Where it appears:** Capability detail page only (v1), inside a collapsible `<details>` panel at the bottom of the page. Only visible when:
- `framework-overlay` module is enabled for the org
- User is an editor or admin

**What it shows:**
- List of existing mappings for this capability: concept label + rationale (read-only for viewers)
- Add mapping: select concept label from TOGAF domain list + optional rationale text
- Remove mapping button (editor/admin only)

**What it does NOT show:**
- TOGAF explanatory text or framework documentation
- Any TOGAF jargon in plain-language sections of the page (the panel is additive, not replacing existing content)

The panel follows the `RelationshipPanel` visual pattern but is simpler — no search, just a dropdown of the four domain labels.

---

## Application Landscape report

**Route:** `/reports/togaf/application-landscape`

**Access:** Org must have `framework-overlay` enabled. All roles can read (same as other detail pages). Editors can see the "add mapping" prompt directly from the report.

**Data query:** All published applications for the org, joined with:
- Their capability links (to show capability → domain derivation where direct mapping doesn't exist)
- Their direct `framework_mappings` records
- Their lifecycle status

**Rendering:** Three sections:

1. **Mapped applications** — grouped by TOGAF Architecture Domain. Each app shows: name, vendor, lifecycle status, linked capabilities. The domain label is shown as a section heading (plain language: "Application Architecture" appears as "Application Architecture Domain").

2. **Derived mappings** — applications not directly mapped but whose linked capabilities have mappings. Shows the inferred domain with a note: "Domain inferred from capability mapping."

3. **Unmapped** — applications with no direct or derived domain mapping. Renders as a gap list with a prompt for editors to add mappings. This is intentional — the gap is data.

**Footer:** Standard GovEA disclosure: "Generated from published records. Gaps indicate missing mappings, not missing systems." Links back to individual application detail pages.

**Not a compliance document.** The report explicitly does not claim TOGAF conformance. A small note: "This report uses TOGAF Architecture Domain labels for grouping. It does not assert TOGAF process conformance."

---

## Visibility and tenant rules

- Framework mappings are org-scoped. No cross-org mapping in v1.
- The report respects existing application visibility rules (published only, org-bounded).
- Disabling the framework-overlay module hides the UI affordances but does not delete mapping data. Re-enabling restores them.

---

## Implementation dependencies

| Dependency | Status |
|------------|--------|
| `enabledModules` jsonb on organizations | Exists |
| Module toggle UI in settings | Exists |
| Application + capability data | Exists |
| Audit trail | Exists (mappings should log add/remove via existing audit action) |
| `glossary_term_sources` (partial analog) | Exists — Framework Reference Management can build on this later |

---

## Persona risk acknowledgement

Enterprise Architect, Agency EA Coordinator, and Department Director are **Assumed** personas per the capability documentation. This slice proceeds with that assumption as an explicit, accepted implementation risk. The first report and mapping UI should be evaluated against real EA users before the follow-on slices are built.

---

## Follow-on slices (not in scope here)

1. Mapping UI on application and ADR detail pages
2. ADM Phase Alignment sub-capability
3. Architecture Vision report
4. Standards, Principles & Decisions report
5. Migration Planning report
6. Framework Reference Management dedicated UI
7. Framework overlay configuration per-entity-type control
