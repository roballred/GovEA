# Data Export Design

**Status:** Defined &mdash; **implementation deferred to v2+** per [#86](https://github.com/roballred/GovEA/issues/86).

This document defines how GovEA will export a relationship-preserving snapshot of an organisation&apos;s repository when the implementation lands. It exists so the format, scope, gating, and anti-patterns are agreed before code is written.

Companion to:
- [`docs/test-coverage-targets.md`](./test-coverage-targets.md) (define-now-enforce-later testing)
- [`docs/visual-regression-plan.md`](./visual-regression-plan.md) (define-now-enable-later visual checks)

---

## Why implementation is deferred

Per [#86](https://github.com/roballred/GovEA/issues/86):

> ## Scope (deferred &mdash; v2+)
> - Admin UI: export trigger with format selection (JSON / CSV)
> - Server action: generate export file from all published records in the organisation
> - Relationship format: include linked IDs and type labels, not just foreign keys

Two reasons the deferral makes sense:

1. **The data model is still moving.** Every milestone is adding or reshaping fields (recent: goals, debt items, data architecture leaves, custom fields, taxonomy terms). A repository export shape locked today would be wrong within weeks &mdash; and external consumers building against it would feel every change as a breaking schema change.
2. **No external consumer exists yet.** Building a portability format with no one on the other end optimising it for nothing. The first real consumer (pilot tenant handing off to another tool, consultant ending an engagement, government auditor) should drive the format choices, not internal guesses.

When the implementation lands, it lands once &mdash; with the right shape because we know who&apos;s reading it.

---

## What an export contains

### Included

| Entity | Notes |
|---|---|
| Personas | All workflow statuses (draft/published/archived); validation-status field preserved |
| Capabilities | All groups + sub-capabilities; rules / behaviours / scope preserved |
| Applications | Including lifecycle status, vendor, hosting model, custom fields (taxonomy-backed) |
| ADRs | Including supersession chain (`supersededBy`) as linked-ID reference |
| Value Streams | Including stages and stage-to-capability links |
| Goals | Including planning horizon, owner |
| Strategic Objectives | Including success metric, time horizon |
| Initiatives | Including status, start/end date, impact-typed capability + application links |
| Principles | Including rationale, implications, principle type |
| Glossary | Including definition source citations |
| Services | Including channels, service owner |
| Architecture Debt | Including severity, debt type, status, security-sensitive flag |
| Data architecture | Entities, attributes, links, business keys, semantic relationships |
| Cross-org links | Approved links from this org as source; received-link metadata |
| Custom fields | Schema + per-record values |
| Taxonomy | Per-org terms + entity-taxonomy assignments |

### Excluded

| Entity | Reason for exclusion |
|---|---|
| `users` table | PII; exporting org members is a separate flow with explicit consent |
| Password hashes / session data | Never |
| `audit_log` | Covered by the separate operational Backup & Export capability (#529); audit log is append-only at the DB layer and has its own retention story |
| OIDC / SSO secrets, SMTP credentials | Operator-managed; never serialised |
| `break_glass_sessions`, `act_as_sessions` | Ephemeral platform-operations records; not org content |
| `instance_settings`, `platform_config` | Instance-scope, not org content |
| Notifications | Per-user runtime state; not architecture content |
| Completeness snapshots | Computed; regenerable from the imported content |

---

## Format

**JSON bundle.** Single file, single download.

CSV considered and rejected for the repository-level export: relationships across 13+ entity types cannot round-trip cleanly through a flat CSV without inventing a sidecar manifest, at which point JSON is simpler. The existing per-entity CSV import/export endpoints (`/api/capabilities/export`, `/api/personas/export`, etc.) stay as-is for single-entity use cases &mdash; they solve a different problem (open in Excel, edit columns, re-import).

### Bundle shape (v0.1 of the format)

```jsonc
{
  "format": "govea-repository-export",
  "version": "0.1",
  "exportedAt": "2026-05-28T10:00:00Z",
  "exportedBy": { "userId": "...", "email": "alice@example.gov" },
  "organization": { "id": "...", "name": "City of Riverdale", "slug": "city-of-riverdale" },
  "counts": { "personas": 16, "capabilities": 11, "applications": 8, ... },

  "entities": {
    "personas":           [ { "id": "...", "name": "...", ... }, ... ],
    "capabilities":       [ ... ],
    "applications":       [ ... ],
    "adrs":               [ ... ],
    "valueStreams":       [ ... ],
    "goals":              [ ... ],
    "strategicObjectives":[ ... ],
    "initiatives":        [ ... ],
    "principles":         [ ... ],
    "glossary":           [ ... ],
    "services":           [ ... ],
    "architectureDebt":   [ ... ],
    "dataEntities":       [ ... ],
    "dataAttributes":     [ ... ],
    "dataLinks":          [ ... ],
    "dataBusinessKeys":   [ ... ],
    "customFieldSchemas": [ ... ],
    "taxonomyTerms":      [ ... ]
  },

  "relationships": {
    "applicationCapabilities": [ { "applicationId": "...", "capabilityId": "..." } ],
    "capabilityPersonas":      [ ... ],
    "objectiveCapabilities":   [ ... ],
    "objectiveValueStreams":   [ ... ],
    "goalObjectives":          [ ... ],
    "initiativeCapabilities":  [ { "initiativeId": "...", "capabilityId": "...", "impact": "build" } ],
    "initiativeApplications":  [ ... ],
    "initiativeObjectives":    [ ... ],
    "adrCapabilities":         [ ... ],
    "adrApplications":         [ ... ],
    "adrInitiatives":          [ ... ],
    "adrObjectives":           [ ... ],
    "principleAdrs":           [ ... ],
    "principleCapabilities":   [ ... ],
    "serviceCapabilities":     [ ... ],
    "servicePersonas":         [ ... ],
    "serviceValueStreams":     [ ... ],
    "debtCapabilities":        [ ... ],
    "debtApplications":        [ ... ],
    "debtInitiatives":         [ ... ],
    "valueStreamStageCapabilities": [ ... ],
    "valueStreamPersonas":     [ ... ],
    "crossOrgLinks":           [ { "sourceEntityType": "capability", "sourceEntityId": "...", "targetOrgId": "...", "targetEntityId": "...", "linkType": "implements" } ],
    "entityTaxonomy":          [ { "entityType": "application", "entityId": "...", "taxonomyTermId": "..." } ],
    "customFieldValues":       [ { "entityType": "application", "entityId": "...", "fieldKey": "...", "value": "..." } ]
  }
}
```

### Why this shape

- **Entities and relationships separate.** Mirrors the relational model. Easier to query (&ldquo;all capability IDs&rdquo; vs. &ldquo;which records have this linked&rdquo;) without flattening.
- **Linked IDs + type labels, not just foreign keys.** Per #86 scope: every junction row carries enough metadata to round-trip without re-querying the schema.
- **Versioned at the bundle level.** `version: "0.1"` so a consumer can target a known shape. Breaking format changes bump the version.
- **No nested object trees.** A capability does not contain its applications inline. Trees are nice to read but a nightmare for diffing; the flat-with-junctions shape preserves what database normalisation gave us.

---

## API shape

```
GET /api/repository/export
```

| Aspect | Behaviour |
|---|---|
| Method | `GET` &mdash; idempotent; safe to retry on transient failure |
| Auth | Required (session cookie); rejected with 401 for unauthenticated |
| Role gate | **Admin only** for the org. Contributors and Viewers receive 403. (Contrast: per-entity CSV exports are contributor-gated; a full org export is a higher-trust operation.) |
| Tenancy | Always exports the caller&apos;s `organizationId`. No `?org=` parameter &mdash; cross-org export goes through break-glass + audit, not this endpoint. |
| Output | `Content-Type: application/json; charset=utf-8` |
| Headers | `Content-Disposition: attachment; filename="govea-export-<org-slug>-<YYYY-MM-DD>.json"` |
| Audit | Every successful export writes an `audit_log` row of action `repository.export` with the exporting user id and timestamp. (Failures audit too &mdash; matters for incident response.) |
| Streaming | First implementation can buffer in memory. Large orgs (>500 capabilities + 5000 applications) move to streaming later; not v0.1 work. |

### Admin UI

A single button on `/settings` reading **&ldquo;Export repository (JSON)&rdquo;** with a one-line subtext: *Downloads a complete relationship-preserving snapshot of this organisation&apos;s EA repository. Excludes users, audit log, and operational secrets.* Click triggers the GET above.

No format-selector dropdown in v0.1 &mdash; JSON only. CSV repository export is a separate decision driven by a real consumer asking for it.

---

## Operational rules

- **Frequency**: no server-side rate limit in v0.1 (admin role is enough gating). Add one if real abuse appears.
- **Storage**: exports are streamed to the caller; nothing is stored server-side. No &ldquo;past exports&rdquo; UI. Re-export is cheap.
- **PII**: the export contains content authored by the org but excludes the `users` table. A persona record&apos;s `createdBy`/`updatedBy` fields export as `userId` opaque strings, not email addresses. Consumers who need to attribute records to humans need a separate, explicit, consented user export &mdash; not this endpoint.
- **Reproducibility check**: the same org export taken twice in the same minute must be byte-identical except for the `exportedAt` timestamp. This is a stability contract; tests should enforce it on the day the implementation ships.

---

## Anti-patterns this document rejects

- **&ldquo;Just zip the CSVs.&rdquo;** Each CSV exports a single entity with no relationship info; gluing them back together is the consumer&apos;s problem &mdash; defeating the &ldquo;relationship-preserving&rdquo; requirement.
- **&ldquo;Embed users so consumers know who wrote what.&rdquo;** PII leakage masquerading as completeness. Users export goes through a separate consent flow.
- **&ldquo;Include audit log in the bundle.&rdquo;** Audit log has its own append-only retention; mixing it into the content export confuses two operational concerns. The separate Backup & Export capability (#529) handles audit-log archive.
- **&ldquo;Nest everything in trees for readability.&rdquo;** Trees diff badly, normalise badly, and the receiving end has to flatten them anyway. Keep entities flat with relationship tables.
- **&ldquo;Add a `?org=<slug>` parameter for instance admins.&rdquo;** Cross-org data movement is a break-glass operation, audited end-to-end. It does not share an endpoint with the org-self-service export.
- **&ldquo;Add format selection (JSON / CSV / YAML / XML).&rdquo;** Format menus are a tell that nobody&apos;s decided what the format should be. Pick one (JSON), ship it, add formats only when a real consumer asks.
- **&ldquo;Compute completeness scores into the export.&rdquo;** Derived data goes stale the moment the import runs. Recompute on the consuming side.

---

## When to enable

The signal to start implementation is **the first real consumer ask** &mdash; a pilot tenant handing off to another tool, a consultant at engagement end, or a government auditor needing the bundle. Until then, the per-entity CSV exports already shipped cover the routine &ldquo;open this in Excel&rdquo; case.

When the implementation lands it follows this shape exactly. The doc is the contract.

---

## Related

- [`docs/test-coverage-targets.md`](./test-coverage-targets.md) &mdash; companion deferred testing doc
- [`docs/visual-regression-plan.md`](./visual-regression-plan.md) &mdash; companion deferred visual-test doc
- Per-entity CSV exports already shipped: `/api/{applications,capabilities,personas,adrs,initiatives,objectives}/export`
- Operational Backup & Export capability ([#529](https://github.com/roballred/GovEA/issues/529)) &mdash; separate concern; covers audit-log archive + recipe-style restore
- [`docs/risk-register.md`](./risk-register.md) R-007 &mdash; portability trust risk this work mitigates
