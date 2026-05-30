# Design: Reconciling #665 (recipe-backed import) with #313 (taxonomy-backed TOGAF)

**Status:** Proposed — design reconciliation, no implementation
**Issues:** [#665](https://github.com/roballred/GovEA/issues/665), [#313](https://github.com/roballred/GovEA/issues/313)
**Capability group:** `ea/framework-alignment`
**Supersedes coordination of:** the "do #665 and #313 in parallel?" open question raised in `docs/product-priorities.md` rank 3 (2026-05-29 grooming)
**Related:** ADR-0001 (TOGAF/ADM scope), `docs/design/togaf-overlay-slice-1.md` (the shipped overlay), #529 (backup export/import — the existing import primitive)

---

## Why this doc exists

Two open design issues describe overlapping TOGAF work and risk being implemented twice or in conflict:

- **#313 — "shift TOGAF compatibility toward taxonomy-backed domains and ADM stages"** (v2.0, design). Describes a **target conceptual model**: TOGAF Architecture Domains and ADM stages become opt-in *taxonomy* vocabularies; entities map to domain terms directly; nothing is a hard-coded overlay.
- **#665 — "replace TOGAF overlay with taxonomy-backed recipe import"** (design). Describes a **delivery mechanism and a teardown**: remove the hard-coded `framework-overlay` module/report/settings, and install TOGAF support as an optional *recipe* that imports taxonomy, mappings, glossary/principle content, and report config idempotently by stable key.

They are **complementary, not duplicates** — but only if sequenced deliberately. This doc proposes that sequencing, grounds it in what already exists in the codebase, and lists the decisions a human / ARB must make before implementation starts.

> **Bottom line:** #665 is the umbrella (mechanism + migration). #313 is the content spec that says *what the TOGAF recipe installs*. Do the **framework-agnostic recipe-import schema first**; make it TOGAF-specific second. Do **not** start either as an implementation track until the four decisions in §6 are resolved.

---

## 1. What each issue actually owns

| Concern | Owned by | Notes |
|---|---|---|
| The TOGAF *conceptual model* (domain scheme, ADM stage vocabulary, which entities map to domains) | **#313** | This is "what should exist," independent of how it's installed |
| The *recipe import format* (schema, idempotency, stable-key resolution) | **#665** | Framework-agnostic primitive; TOGAF is its first consumer |
| *Removing* the hard-coded overlay (`framework-overlay` module, `framework_mappings`, the bespoke report route, settings toggle) | **#665** | The teardown half |
| *Migrating* existing overlay data (shipped `framework_mappings` rows) onto the new model | **neither, explicitly** | Gap — see §6 decision D3 |
| Whether TOGAF support stays opt-in and EasyEA-first | **ADR-0001** | Both issues must stay inside this; neither changes it |

The overlap people worry about is real but narrow: both touch taxonomy and both touch "TOGAF." The clean split is **#313 = vocabulary/model, #665 = transport/teardown.**

---

## 2. The most important finding: the import primitive already mostly exists

#665 asks recipes to "import structured data… idempotent enough to re-run safely… resolve references between imported objects by stable keys rather than environment-specific database IDs." Most of that machinery shipped under **#529** (`apps/govea/src/lib/backup-export.ts` + `backup-import.ts`). The recipe-import design should **extend that envelope, not invent a parallel one.**

What #529 already does that #665 needs:

- A versioned `BackupEnvelope` (`format`, `shape`, `excludes`) — a recipe is essentially the existing `shape: 'recipe'` export (org settings + taxonomy + entity-taxonomy defs + custom-field schemas, **no content rows**).
- A `collectRecipe()` that already serializes `taxonomyTerms`, `entityTaxonomyDefinitions`, and org module/config settings.
- A dependency-ordered replay in `importArchive()`: config → taxonomy → parents → junctions, in one transaction, with `entityTaxonomyValues` re-pointed to the destination org.
- Explicit, documented excludes (passwords, SMTP creds, audit log).

What #529 deliberately does **not** do — and what #665's recipe import must add:

| #529 backup-import (today) | #665 recipe-import (needed) | Why the gap matters |
|---|---|---|
| Keyed by **UUID**; junctions replay verbatim because ids are preserved | Keyed by **stable slug/natural key**; ids resolved at import time | A recipe is authored once and installed into *many* orgs with different UUIDs. UUID-keying only works for same-org restore. |
| **Destructive**: wipes the destination org, then inserts | **Idempotent upsert**: re-running adds nothing duplicate, updates in place | "Install the TOGAF recipe" must be safe to run on an org that already has content. |
| **Same-org only** (explicit guard: `envelope.orgId !== destOrgId` throws) | **Any-org** install | Recipes are portable by definition. |
| Whole-org scope | **Partial / additive** scope (just the TOGAF slice) | A recipe layers onto existing content; it doesn't replace it. |

So #665's "design slice 1" (recipe import schema + idempotency rules) is concretely: **take the #529 envelope + collectors as the serialization baseline, add (a) a stable-key resolution layer and (b) upsert-by-natural-key semantics.** This is framework-agnostic and is the correct first build. It also directly advances the broader portability story (risk **R-007**) because slug-keyed, idempotent import is exactly what Services / Value Streams / Principles / Glossary need to round-trip across environments.

---

## 3. Current hard-coded surfaces #665 must retire or rewire

From `grep` of the live tree (`*togaf*`, `framework*`, `framework-overlay`):

- `apps/govea/src/lib/modules.ts` — `framework-overlay` ModuleKey (opt-in, `defaultOn: false`, `group: 'Framework'`, `href: null`)
- `apps/govea/src/db/schema/framework-mappings.ts` — the `framework_mappings` table (`entity_type`, `entity_id`, `framework`, `concept_label`, `rationale`)
- `apps/govea/src/actions/framework-mappings.ts` — add/remove mapping server actions
- `apps/govea/src/components/framework-mapping-panel.tsx`, `framework-toggles.tsx`
- `apps/govea/src/app/(admin)/reports/togaf/application-landscape/page.tsx` — the bespoke report
- `apps/govea/src/app/(admin)/reports/architecture-vision/page.tsx` — framework-friendly summary
- `apps/govea/src/db/seeds/togaf-demo-fixtures.ts` — Hartfield demo dataset
- Settings: the "Framework Alignment" toggle section

The reframe target (#313): `framework_mappings.concept_label` (fixed 4-value TOGAF domain list) becomes **taxonomy terms** in a TOGAF domain *scheme*, and mappings become **`entity_taxonomy_values`** rows — the same generic mechanism every other classification already uses. The report then reads taxonomy instead of the bespoke table.

---

## 4. Proposed sequencing

```
#665 (umbrella: mechanism + teardown)
│
├─ Slice 1  Recipe import SCHEMA + idempotency/stable-key rules   ← BUILD FIRST
│           framework-agnostic; extends the #529 envelope.
│           Deliverable: a spec + the import resolver, no TOGAF content.
│
├─ Slice 2  TOGAF recipe CONTENT  ──────────── defined by #313 ──┐
│           domain scheme + (maybe) ADM scheme as taxonomy,      │ #313 is the
│           sample mappings, glossary/principle starter content. │ content spec
│           Depends on Slice 1 + Decision D1/D2.                 │ for this slice
│                                                                ┘
├─ Slice 3  Rewire report/UI to read taxonomy (not framework_mappings)
│
├─ Slice 4  Migrate existing framework_mappings rows → entity_taxonomy_values
│           (Decision D3)
│
└─ Slice 5  Remove the overlay module/toggle/table; update docs + ADR pointer
            (Decision D4)
```

**#313's disposition:** keep it **open**, re-labelled as the **content spec for #665 Slice 2** rather than an independent implementation track. Its "seed the Hartfield demo org" outcome becomes the acceptance demo for Slice 2. This avoids the parallel-work risk the grooming flagged without throwing away #313's modelling thinking.

---

## 5. Where this rubs against ADR-0001 (must not be ignored)

ADR-0001 states ADM phase tracking is **explicitly out of scope for v1 *and* v2**, and that changing it requires a *new* ADR plus validated demand from at least two government organisations.

#313 proposes an **ADM stage taxonomy** (Preliminary, A–H, Requirements Management) as *optional classification, not enforced workflow*. That is plausibly inside ADR-0001's "annotation, not enforcement" line — but it is close enough to the boundary that it cannot be assumed. **The domain-scheme half of #313 is clearly within ADR-0001; the ADM-stage half is not obviously so.** Treat them as separable: ship TOGAF *domains as taxonomy* without waiting on the ADM question.

---

## 6. Decisions required before implementation (human / ARB)

| # | Decision | Why it blocks | Recommendation |
|---|---|---|---|
| **D1** | Model domain vocabularies as a taxonomy **scheme/family** (e.g. `scheme: 'togaf-domain'`) or as **top-level taxonomy branches**? | Determines the taxonomy schema shape Slice 1's resolver must support | Scheme/family field — keeps business domains and TOGAF domains from colliding, and generalises to future frameworks |
| **D2** | Is the **ADM-stage taxonomy** in scope, or deferred pending a superseding ADR? | ADR-0001 puts ADM out of scope through v2; classification-vs-workflow is a judgement call | **Defer ADM**; ship domains-as-taxonomy now. Open a separate ADR for ADM-stage classification with the two-org demand bar. Don't let it block Slice 2. |
| **D3** | Migrate existing `framework_mappings` rows to `entity_taxonomy_values`, or leave the old table read-only until orgs re-map? | Neither issue owns the migration; shipped Hartfield data exists | One-shot idempotent migration in Slice 4, keyed by `(entity_type, entity_id, concept_label)` → domain term slug. Cheap; preserves the demo. |
| **D4** | Keep `framework-overlay` as a module key (now gating a recipe-installed taxonomy) or remove the concept entirely? | Determines whether "TOGAF enabled?" is a module flag or simply "is the recipe installed?" | Replace the module flag with recipe-presence detection, but keep a thin `framework-overlay` nav/visibility gate so plain-language views stay jargon-free per ADR-0001 §Decision-4. |

These are genuine product/architecture calls, not implementation details — they should be answered (ideally at ARB) before Slice 1 code begins.

---

## 7. Acceptance for *this* design step

- [x] #665 and #313 each have a single, non-overlapping responsibility (§1)
- [x] The recipe-import primitive is grounded in the existing #529 envelope, with the two concrete gaps named (§2)
- [x] The hard-coded surfaces to retire are enumerated (§3)
- [x] A slice sequence exists with #313 repositioned as the content spec for #665 Slice 2 (§4)
- [x] The ADR-0001 boundary is called out and the ADM question separated from the domain question (§5)
- [x] D1–D4 answered (§6, §9) — resolved by the lead architect 2026-05-30; see §9

## 8. Next actions

1. Post this reconciliation on #665 and #313 (link the doc); re-scope #313 as "content spec for #665 Slice 2."
2. Put D1–D4 to ARB / the maintainer.
3. Once D1–D4 land, open the **Slice 1** implementation issue: framework-agnostic recipe-import schema + idempotency/stable-key resolver, extending `lib/backup-export.ts`'s envelope. (That issue also serves R-007 portability.)

> **Update 2026-05-30:** D1–D4 are resolved (§9) and the slices are filed (§10). ADM is recorded in [ADR-0002](../decisions/0002-adm-as-classification.md). §5–§6 above are retained for history; §9 is authoritative where they differ (notably: D1 needs no `scheme` column, and ADM-as-classification is permitted, not deferred).

---

## 9. Decisions — resolved by lead architect (2026-05-30)

The lead architect set the direction below; D1–D4 are resolved and the implementation slices (§10) are unblocked. The ADM call is recorded formally in **[ADR-0002](../decisions/0002-adm-as-classification.md)**.

| # | Decision | Resolution | Why it's simpler than the doc's original framing |
|---|---|---|---|
| **D1** | Domain vocabulary modelling | **Parent type term is the namespace.** A taxonomy "type" is already a top-level `taxonomy_terms` row whose children are its values (how "Domain", "Application Type", etc. work today). The TOGAF domain type is just a named type with a **stable slug** (e.g. `togaf-architecture-domain`) for machine lookup. | No `scheme`/`family` column needed — the named parent term *is* the scheme. Zero schema change. |
| **D2** | ADM stages in scope? | **Yes, as classification taxonomy** (type "ADM Phase" with Preliminary, A–H, Requirements Management). No phase gates, approvals, or transition rules. Recorded in **ADR-0002**, which narrows ADR-0001 consequence #3 to the *enforcement* case only. | Excluding one specific vocabulary would need special-case code; permitting it is the no-op path. |
| **D3** | Existing `framework_mappings` rows | **Migrate** to `entity_taxonomy_values`, keyed `(entity_type, entity_id, concept_label)` → domain term slug. Preserves the Hartfield demo. | One idempotent migration; no stranded data. |
| **D4** | `framework-overlay` module flag | **Remove it.** "Is TOGAF on?" becomes "are the recipe's taxonomy types present?" — settings-free. Add an **`audience: 'framework'` marker on the taxonomy type** so framework types stay hidden from viewer-role users and stakeholder reports (the principled replacement for the toggle that ADR-0001 still requires). | Presence-based; the `audience` flag is a small, *general* taxonomy feature, not TOGAF-specific. |

**Additional direction (beyond D1–D4):**

- **Reports — generic engine + TOGAF preset.** Build a framework-agnostic "group by any taxonomy type" report engine; ship TOGAF as a **saved preset** (Application Landscape grouped by the domain type; an ADM-coverage view grouped by the ADM-Phase type). The preset finds its type by the stable slug from D1. New classification views then cost almost nothing.
- **Delivery — built-in curated catalog.** The TOGAF recipe is **defined in-repo as data** and run via an admin **"Install"** action from a Recipes list. **No file upload in v1** — avoids the parsing/validation/security surface. File-based recipe import (the #529-envelope-extension path) is a deliberately deferred follow-on.
- **Recipe scope — turnkey, not just dropdowns.** The TOGAF recipe installs **taxonomy types + terms + entity bindings, _plus_ glossary terms, _plus_ a starter set of architecture principles, _plus_ report presets**. "Install TOGAF" yields a usable, explained TOGAF surface, not two empty selects.
- **TOGAF is recipe #1, not a special case.** The engine is framework-agnostic; NIST, FEAF, a state reference model, etc. each become their own recipe later.

## 10. Implementation slices (filed as issues, gated on ADR-0002)

| Slice | Issue | Scope | Depends on |
|---|---|---|---|
| **S1** | [#671](https://github.com/roballred/GovEA/issues/671) | Generic recipe-install **engine**: idempotent upsert by `(org, slug)` for taxonomy types/terms/bindings + glossary + principles + presets; the `audience` flag; admin **Install** action; built-in catalog list. | ADR-0002 accepted |
| **S2** | [#672](https://github.com/roballred/GovEA/issues/672) | **TOGAF recipe definition** (data): domain type + values, ADM-Phase type + values, TOGAF glossary terms, starter principles, report presets. | S1 |
| **S3** | [#673](https://github.com/roballred/GovEA/issues/673) | Generic **group-by-taxonomy-type report engine** + TOGAF Application Landscape and ADM-coverage **presets**; repoint the existing report off `framework_mappings`. | S1, S2 |
| **S4** | [#674](https://github.com/roballred/GovEA/issues/674) | **Migrate** `framework_mappings` → `entity_taxonomy_values`; preserve the Hartfield demo. | S2 |
| **S5** | [#675](https://github.com/roballred/GovEA/issues/675) | **Teardown**: remove the `framework-overlay` module/toggle, `framework_mappings` table + actions + panel; update the `ea/framework-alignment` capability docs and ADR pointers. | S3, S4 |
