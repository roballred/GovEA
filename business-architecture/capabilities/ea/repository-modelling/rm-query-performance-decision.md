# Architecture Decision: Query Performance for Traversal and Completeness (v1)

## Decision

1. **Traversal depth** — Impact panel traversal is bounded at a configurable depth, default 3 hops, hard cap 5.
2. **Completeness calculation** — Completeness snapshots are pre-computed and stored. A snapshot is triggered asynchronously on any EA object mutation; a nightly scheduled job is a safety-net fallback. The dashboard reads from the snapshot table, never from live joins.
3. **Historical snapshot storage** — One snapshot row per organization per day. Each row stores aggregate counts only (no individual object data). Retention is 36 months by default, configurable.
4. **Response time SLOs** — Impact panel traversal: < 2 s at default depth, hard timeout at 5 s with partial-results degradation. Completeness dashboard: < 500 ms. Historical trend line: < 1 s.

---

## Context

ARB review (issue #134) flagged that neither `rm-end-to-end-traceability` nor `rm-repository-completeness` defined a query performance strategy before implementation. At the target scale of 100–500 applications with a full capability map, naive implementations of unbounded traversal and live multi-table completeness joins will be too slow to be usable.

The four decisions above must be resolved before implementation issues are opened for either capability.

---

## Rationale

### Decision 1 — Traversal depth

The core EA chain (Objective → Initiative → Capability → Application → Persona) spans 4 hops. The vast majority of meaningful impact traces are within this range. Beyond 5 hops the traversal graph expands exponentially and the results become noise rather than signal — every object in a well-connected repository becomes reachable. A hard cap at 5 prevents runaway queries. The default of 3 keeps the common case fast and focused without requiring configuration.

Depth is configurable at the org level so agencies with deeper chains (e.g. multi-tier capability hierarchies) can raise the limit intentionally. The hard cap is not configurable — it is a performance and security boundary, not a preference.

### Decision 2 — Completeness calculation strategy

Completeness calculations join across all object types and their relationship tables. Running these as live queries on every dashboard load is O(n) per org and will degrade as the repository grows. On-demand caching with a TTL introduces a separate invalidation problem: a cache that survives a publish event shows stale data at exactly the moment architects need current information.

Pre-computing on write avoids both problems. When any EA object is created, updated, published, or deleted, an async job recomputes the org's snapshot. The dashboard always reads a single row. The nightly fallback ensures snapshot freshness even for orgs that go days between edits (rare but possible).

Write-triggered recomputation is preferred over pure nightly scheduling because the dashboard must reflect the current state immediately after an architect publishes content — not at the next midnight run.

### Decision 3 — Historical snapshot storage

The trend line feature requires time-series data. Storing one aggregate row per org per day is sufficient granularity for monthly and quarterly trend views, and the storage cost is negligible:

| Orgs | Retention | Row size | Total |
|------|-----------|----------|-------|
| 100  | 12 months | ~500 B   | ~1.8 MB |
| 100  | 36 months | ~500 B   | ~5.4 MB |
| 1000 | 36 months | ~500 B   | ~54 MB  |

Each snapshot row stores aggregate counts per object type (total, published count, complete-relationship count, within-staleness-window count) and the org ID and date. No individual object references are stored in the snapshot — those are resolved at drill-down time from live tables.

### Decision 4 — Response time SLOs

These targets are achievable with the pre-computed snapshot strategy and the index strategy below, and are grounded in what government users will tolerate for analytical views (not real-time operations):

| Operation | Target | Degradation behaviour |
|-----------|--------|-----------------------|
| Impact panel traversal (default depth 3) | < 2 s | Hard timeout at 5 s; return partial results with indicator |
| Completeness dashboard | < 500 ms | Read from snapshot row — no join required |
| Historical trend line | < 1 s | Time-series query on snapshot table with index |

If a traversal query exceeds the 5 s timeout, the panel returns whatever hops completed with a "results may be incomplete — try a shallower depth" indicator. It does not block or error.

---

## Required Indexes

The following indexes must be created before either capability ships. These are not optional — without them, completeness counts and traversal joins will table-scan at realistic object counts.

**Relationship tables** (all tables implementing many-to-many EA object links):
- `(organization_id, source_id)` — forward traversal
- `(organization_id, target_id)` — reverse traversal

**Content tables** (capabilities, applications, personas, objectives, initiatives, ADRs):
- `(organization_id, status)` — completeness counts by publish status
- `(organization_id, updated_at)` — staleness window queries

**Completeness snapshot table** (new):
- `(organization_id, snapshot_date DESC)` — trend line queries
- Primary key on `(organization_id, snapshot_date)` — prevents duplicate daily snapshots

---

## Consequences

- The completeness dashboard is eventually consistent with live data — a mutation triggers an async recompute, so there is a brief window (typically < 1 s on a lightly loaded system) where the dashboard reflects the state before the last write. This is acceptable for an analytics view.
- The trend line has daily granularity. Sub-daily changes are not tracked in the history; only the day's final computed snapshot is stored.
- Traversal results at depth 3 may omit objects that are only reachable via 4+ hops. The UI must communicate the active depth to the user and offer a depth control.
- The 5 s traversal timeout means very large or circular graphs return partial results rather than erroring. Circular traversal must be guarded with a visited-node set regardless — this is a correctness requirement, not just a performance one.
- Implementation must create the completeness snapshot table and the write-trigger job before the completeness dashboard can ship.

---

## Status

Accepted — pre-implementation requirement for `rm-end-to-end-traceability` and `rm-repository-completeness`

## Related

- ARB finding: roballred/GovEA#134
- Closes: roballred/GovEA#134
- Capabilities affected: `rm-end-to-end-traceability`, `rm-repository-completeness`
