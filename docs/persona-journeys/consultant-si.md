# Persona Journey — Consultant / Systems Integrator

**Persona file:** [`business-architecture/personas/consultant-si.md`](../../business-architecture/personas/consultant-si.md)
**Capability anchors:** [`ac-backup-export`](../../business-architecture/capabilities/cms/admin-configuration/ac-backup-export.md), [`ac-feature-management`](../../business-architecture/capabilities/cms/admin-configuration/ac-feature-management.md), [`mo-content-workflow`](../../business-architecture/capabilities/cms/multi-org/mo-content-workflow.md); candidate new — contributor-scoped audit view, per-entity CSV I/O.
**Walk audited:** 2026-05-19 — fifteenth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #595](https://github.com/roballred/GovEA/issues/595))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `carol@govea.dev` (Riverdale Contributor — closest proxy for an external consultant who lands at Contributor scope, not Admin).

This walk's distinctive lens vs. prior walks:

- **Early-Maturity Practice Lead** ([#586](https://github.com/roballred/GovEA/issues/586)) — first-time internal practice founder.
- **Agency EA Coordinator** ([#553](https://github.com/roballred/GovEA/issues/553)) — internal liaison with parent enterprise scaffolding.
- **Domain Architect** ([#580](https://github.com/roballred/GovEA/issues/580)) — internal technical specialist editing through the mainline surfaces.
- **Consultant / SI** — *external*, time-boxed, **brings content from previous engagements**, must leave a working repository the client can maintain alone after handover.

The persona's critical insight is clear: *"Consultants and SIs are disproportionately influential in GovEA adoption: they recommend tools, configure initial environments, and train client teams. Supporting this persona well is an indirect path to broader adoption."*

## Canonical journey

1. Sign in as Contributor — Carol Contributor (proxy for an external consultant given Contributor access).
2. Onboarding speed assessment — can the consultant get useful work done in week 1?
3. Look for data import paths — can the consultant bring a capability map or persona library from a prior engagement?
4. Look for structured export — what can the consultant hand over to the client at engagement end?
5. Walk the Audit Log — can the consultant understand the repository's history before making changes?
6. Verify Contributor-scope authoring — can the consultant do the work without admin?
7. Look for "engagement user" / time-boxed access patterns — is there a path for short-term external access?

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in as Contributor | **Works** | Dev shortcut "Riverdale Contributor" lands Carol. Same sign-in friction from [#548](https://github.com/roballred/GovEA/issues/548). |
| 2 | Onboarding speed | **Partial** | Dashboard, coverage tiles, Recent Activity, and the Product Tour are all immediately available — the consultant can orient in minutes. **Gap:** no per-engagement context (consultant doesn't see "you're new here"); the persona's *"first week to useful work"* still depends on imports + audit, both gapped below. |
| 3 | Data import paths | **Partial** | `Import CSV` exists **only on `/applications`** — six other catalog surfaces (`/capabilities`, `/personas`, `/adrs`, `/initiatives`, `/services`, `/objectives`) have no bulk import. The consultant cannot bring a capability map starter or persona library from a prior engagement without manual re-entry — the persona's #1 stated pain point. Gap [#596](https://github.com/roballred/GovEA/issues/596). |
| 4 | Structured export | **Partial** | Same shape: `Export CSV` exists only on `/applications`. The consultant has no structured handover deliverable for the rest of the catalog. `ac-backup-export` capability doc explicitly notes a full-org backup capability is **not yet implemented**. The walk's [#596](https://github.com/roballred/GovEA/issues/596) is the tactical per-entity subset; full backup is the strategic follow-up. |
| 5 | Audit Log | **Missing for this role** | `/audit` redirects Contributors to `/dashboard` (`isAdmin()` gate). Persona file explicitly lists audit-trail access as a relevant capability — *"client repositories often require archaeology before new work can begin."* A contributor-tier consultant cannot read the recent past without admin escalation. Gap [#597](https://github.com/roballred/GovEA/issues/597). |
| 6 | Contributor-scope authoring | **Works** ✅ | Carol can view, edit, and link across all catalog surfaces (Applications, Capabilities, ADRs, Personas, Initiatives, Services, Objectives, Value Streams, Principles, Glossary, Data Architecture). No surface forces admin escalation for routine content work. The Contributor scope is well-judged. |
| 7 | Engagement-user pattern | **Missing (design-shape)** | No "engagement", "guest", or time-boxed user concept exists. A consultant gets a permanent org user that the client admin must remember to deactivate at engagement end. Not filed — this is a design-shape ask rather than a build gap. Notable for future RBAC design (see Considered-but-not-filed). |

**Tally:** 1 confirmed-works ✅ · 3 partial · 1 missing · 1 design-shape future ask · 1 friction (sign-in).

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#596](https://github.com/roballred/GovEA/issues/596) | High (persona-foundational) | Extend CSV import/export beyond Applications to Capabilities, Personas, ADRs, Initiatives, Services, Objectives, Value Streams, Principles, Glossary, Data Architecture. Concrete suggested order matching the persona's *"capability map / application inventory / persona library"* sequence. Round-trip property: Export → unchanged → Import = zero diff. |
| [#597](https://github.com/roballred/GovEA/issues/597) | Medium (persona-named capability) | Contributor-readable audit log scoped to objects the contributor can already see — same federation + workflow rules already applied to detail pages. Sensitive actions (user creation, role change, instance settings) stay admin-only and don't appear at all in the contributor view. |

### Existing gaps that apply equally

- [#587](https://github.com/roballred/GovEA/issues/587) — Starter content + first-time experience. The Early-Maturity Practice Lead walk surfaced this; the Consultant persona is the **other** primary beneficiary — the consultant *is* the starter content for engagements where the practice doesn't yet exist.
- [#581](https://github.com/roballred/GovEA/issues/581) — Change notifications. A consultant who has handed over the repository wants to know if a regression-prone change happens after they leave (or before, when they're on PTO).
- [#549](https://github.com/roballred/GovEA/issues/549) — `/traceability` top-level entry; useful for handover briefings.
- [#559](https://github.com/roballred/GovEA/issues/559) — print/presentation export; consultant prepares engagement-end deliverables.
- `ac-backup-export` capability — already documented as not yet implemented (PR [#576](https://github.com/roballred/GovEA/pull/576)); [#596](https://github.com/roballred/GovEA/issues/596) is the tactical subset of that capability.

### Considered but not filed

- **Engagement / guest / time-boxed user RBAC pattern.** A consultant gets a permanent user in the client org; no built-in expiry, no "consultant scope" flag, no built-in "deactivate at engagement end" reminder. This is design-shape work, not a build gap — file as a discrete design issue if the audit later confirms the demand.
- **Cross-org import (Client A → Client B).** Sensitive (content-visibility rules need reasoning). Explicitly out of scope in [#596](https://github.com/roballred/GovEA/issues/596); could become a future workstream.

### Persona-validation note

Persona is **Assumed**. The persona file is unusually precise about three specific affordances — *fast onboarding, structured exports, bringing pre-built content* — and the audit found that GovEA delivers approximately zero of them for any entity except Applications. If the persona model is right, this is a *high-leverage* gap to close. If validation later reveals consultants actually prefer to start from scratch in each client environment (some do), the priority of [#596](https://github.com/roballred/GovEA/issues/596) drops correspondingly.

## Strong positives — particularly relevant to this persona

- **Applications CSV import/export** is the proof point that the rest of the catalog can follow. Custom Field support (`Application Custom Fields` in Settings) makes the export schema reasonably extensible.
- **Contributor-scope authoring is well-judged.** Carol could edit and link across all 11+ surfaces without admin escalation; the role is genuinely useful for engagement work. The lock-outs are concentrated on legitimate admin surfaces (Audit, Users, Connections, Settings) — appropriate guardrails for an external contributor.
- **Architecture Vision report** and **Executive Summary** are credible handover deliverables — the consultant can print or screenshot them as engagement closeout, even without structured export shipped. (Persona-foundational positive carried over from Early-Maturity Practice Lead walk.)
- **`ac-backup-export` capability doc exists** (PR [#576](https://github.com/roballred/GovEA/pull/576)) with a clear forward-looking shape. The team has *thought about* this gap; it just isn't built yet.

## Cumulative state after fifteen walks

- **1 / 16 personas remaining**: business-stakeholder.
- This walk produced **two net-new gaps** ([#596](https://github.com/roballred/GovEA/issues/596) persona-foundational High, [#597](https://github.com/roballred/GovEA/issues/597) persona-named Medium) — both concrete, both reference the persona file's exact wording.
- The walk also surfaced an instructive **negative space pattern**: the Consultant persona is a strong adoption-leverage segment (they recommend tools), and almost every named relevant capability for them is partial or missing. This is the audit's first walk where the persona's stated capabilities and the build's shipped capabilities diverge sharply across the board.

## Recommended follow-up

1. **[#596](https://github.com/roballred/GovEA/issues/596)** is the strategic capability for this segment — and incrementally shippable. Capabilities CSV alone (first entity in the suggested order) would meaningfully change the consultant's week-1 experience. Not the next sprint, but the *highest-leverage feature* surfaced by the consultant lens.
2. **[#597](https://github.com/roballred/GovEA/issues/597)** is more contained — the `/audit` page already exists with a working admin filter UI (#534); the work is filtering rows to objects the contributor can see, not building a new surface. Smaller scope, higher persona-fit per unit effort.
3. **Final persona walk (1 remaining):**
   - [`business-stakeholder`](../../business-architecture/personas/business-stakeholder.md) — applies symmetrically to Viewer/Elected-Official but with a different question shape.

   Recommend `business-stakeholder` as the **closeout walk** to wrap the 16-persona audit. After that, the recommended cumulative next step is to write `docs/persona-journeys/README.md` tallying gaps per persona and per capability, per the epic [#515](https://github.com/roballred/GovEA/issues/515) acceptance.
