# List-view CSV import/export inventory (#748)

This inventory tracks every **recipe/archive-exportable** entity family (the
content serialized by `src/lib/backup-export.ts`) against its list-view CSV
support. The rule #748 enforces: *if an entity is recipe-exportable and has a
list view, it must have list-view `Export CSV` and `Import CSV` controls with a
round-trip-safe importer.*

CSV is the human-editable, spreadsheet-friendly path for reviewing, cleaning,
onboarding, and handing off content. It does **not** replace recipe/archive
backup and restore (full-fidelity portability) — see #529.

## Coverage

| Entity | List view | CSV export | CSV import | Relationship keys (human-readable) | Source |
|---|---|---|---|---|---|
| Personas | ✅ | ✅ | ✅ | — | #596 |
| Capabilities | ✅ | ✅ | ✅ | `personas` (names) | #596 |
| Applications | ✅ | ✅ | ✅ | `capabilities` (names) | #696 |
| Strategic Objectives | ✅ | ✅ | ✅ | capabilities / value streams (names) | #629 |
| Initiatives | ✅ | ✅ | ✅ | capabilities / objectives (names) | #629 |
| ADRs | ✅ | ✅ | ✅ | linked entities (names/numbers) | #596 |
| Glossary | ✅ | ✅ | ✅ | — | #721 / #723 |
| **Services** | ✅ | ✅ | ✅ | `personas`, `capabilities`, `value_streams` (names) | **#748** |
| **Value Streams** | ✅ | ✅ | ✅ | `personas`, `capabilities` (names); `stages` (encoded — see below) | **#748** |
| **Goals** | ✅ | ✅ | ✅ | `objectives` (names) | **#748** |
| **Strategies** | ✅ | ✅ | ✅ | `owner_email`; `goals`, `capabilities`, `value_streams`, `initiatives` (names) | **#748** |
| **Principles** | ✅ | ✅ | ✅ | `adrs` (ADR numbers), `capabilities` (names) | **#748** |
| Taxonomy terms | n/a | — | — | Intentionally excluded — see below |

## Shared contract

- **Controls:** the `CsvImportExportControls` component renders consistent
  `Export CSV` + `Import CSV` affordances (label, placement, dry-run dialog)
  for users with edit permission (admin/contributor).
- **Upsert key:** `name` (case-insensitive). Re-importing an unchanged export
  creates **no new rows** and re-applies existing rows idempotently (existing
  rows report as `updated`, links preserved), matching the Capability contract.
- **Relationships** are exported/imported by stable human-readable keys (names,
  ADR numbers, owner email) — never raw UUIDs. Unknown / cross-org keys are
  row-level warnings, not failures; the row still imports without the bad link.
- **Org scope:** export is filtered to the caller's own org (federated
  read-only rows are excluded so re-import can't duplicate external records);
  import resolves relationships only within the caller's org and cannot attach
  rows to another organization by guessed name.
- **Dry-run:** every importer supports a preview pass returning
  created/updated/skipped/error counts without writing.
- **Audit:** every successful import writes an audit event with those counts.

## Value stream `stages` encoding

Value streams own ordered stages, each with stage-level capabilities, which do
not fit a single flat column losslessly. The `stages` column uses a best-effort
encoding that round-trips the common case:

```
Stage name: Capability A, Capability B | Next stage: Capability C | Final stage
```

Pipe (`|`) separates ordered stages; an optional `: ` introduces a
comma-separated capability-name list for that stage. Stage descriptions and any
future per-stage metadata are **not** carried in CSV — use the value-stream
editor or recipe/archive export for full-fidelity stage structure.

## Intentional exclusions

- **Taxonomy terms** — recipe-exportable, but configuration vocabulary managed
  through the dedicated Taxonomy admin UI rather than an entity content list.
  Round-tripping taxonomy through per-entity CSV would risk orphaning the
  entity references that depend on it; recipe/archive backup remains the
  portability path for taxonomy. No list-view CSV.
- **Data-architecture entities** (data entities/attributes/links) — not part of
  the recipe/archive content set in `backup-export.ts`, so out of scope here.

## Out of scope (per #748)

Excel `.xlsx`, third-party EA tool formats, replacing recipe/archive backup, and
cross-organization content transplant beyond the existing org-scoped rules.
