# Stakeholder Feature Assumption Register

**Purpose:** Map each stakeholder-facing feature to the specific assumptions it depends on, ranked by consequence if the assumption is wrong. Use to prioritize which interview answers matter most before the next build.

**Features covered:** Repository Confidence Summary, Roadmap Timeline, Guided Answers, Repository Modelling (completeness + capability mapping), Integration & Reconciliation
**Related issues:** [#216](https://github.com/roballred/GovEA/issues/216), [#384](https://github.com/roballred/GovEA/issues/384)
**Companion docs:** [`validation-plan.md`](./validation-plan.md), [`stakeholder-interview-guide.md`](./stakeholder-interview-guide.md), [`business-architecture/feedback-log.md`](../../business-architecture/feedback-log.md)

**Priority ratings:**
- **P1** — wrong assumption likely breaks the feature's value proposition entirely
- **P2** — wrong assumption degrades usefulness but the feature survives
- **P3** — wrong assumption creates friction but doesn't invalidate the feature

---

## Repository Confidence Summary

| ID | Assumption | Persona | If wrong | Priority |
|----|-----------|---------|----------|----------|
| RC-1 | Stakeholders check freshness before acting on data — a staleness signal changes behavior | Elected Official, Budget Analyst | The label is ignored; no one reads metadata before using a view | P1 |
| RC-2 | "Actively maintained / under development / getting started" labels are legible without a definition | Elected Official | Labels are opaque or feel like jargon ("maintained by whom? for what?") | P1 |
| RC-3 | A percentage score mapped to a label is more trustworthy than a raw number | Budget Analyst | Analysts want the number and the methodology, not an abstracted label | P2 |
| RC-4 | Stakeholders attribute the confidence rating to the IT team, which is sufficient for their purposes | Both | They need to know which human is accountable — a label without a name carries no weight in oversight | P2 |
| RC-5 | The narrative field (admin-authored) will be filled in and kept current | Both | Feature silently degrades into label-only; optional fields in practice become empty fields | P3 |

**Riskiest assumption:** RC-1. If no one reads freshness labels before acting, the entire feature is decorative.

---

## Roadmap Timeline

| ID | Assumption | Persona | If wrong | Priority |
|----|-----------|---------|----------|----------|
| RT-1 | Elected officials want to see initiative sequence over time, not status counts or budget totals | Elected Official | The timeline view answers a question they don't ask; they want "how much" before "when" | P1 |
| RT-2 | A 1–3 year horizon is the right window; shorter (current fiscal year) or longer (capital plan) is less useful | Both | Elected officials think in fiscal years; budget analysts think in multi-year CIP cycles — neither maps cleanly to a rolling 3-year view | P1 |
| RT-3 | "Roadmap" is a legible term that implies forward planning, not a completed route | Elected Official | "Roadmap" reads as a finished document or a promise, not a living plan; creates accountability expectations the tool doesn't intend to carry | P2 |
| RT-4 | Stakeholders will trust initiative data entered by IT staff without external corroboration | Budget Analyst | Budget analysts expect to reconcile this against the capital budget or CIP — mismatches make IT look unreliable, not the tool | P2 |
| RT-5 | Seeing which capabilities each initiative affects is useful context, not noise | Both | At the stakeholder level, capability linkages are inside baseball; what matters is which departments or services are affected | P3 |

**Riskiest assumption:** RT-2. If the time horizon is wrong, the view answers a question no one is asking at the moment they need an answer.

---

## Guided Answers

| ID | Assumption | Persona | If wrong | Priority |
|----|-----------|---------|----------|----------|
| GA-1 | Elected officials and budget staff will ask questions directly, without staff intermediation | Elected Official | The actual user is a chief of staff or budget analyst using the tool on behalf of the principal — the UX needs to work for the proxy, not the elected official | P1 |
| GA-2 | Plain-language answers reduce the need for staff interpretation | Both | Plain language lowers the reading burden but doesn't eliminate the trust deficit — stakeholders still want a human name attached to the answer | P1 |
| GA-3 | The questions stakeholders ask map to the entity types GovEA stores (capabilities, applications, personas) | Budget Analyst | Budget staff ask about cost centers, FTEs, and contract vehicles — none of which are in GovEA's data model | P2 |
| GA-4 | A direct question-answer format is preferred over a dashboard for this audience | Both | Some users want an overview first and drill down; others want to ask a specific question and stop — the right default is unknown | P2 |
| GA-5 | Stakeholders will know enough to ask a useful question without prompting | Elected Official | Without suggested questions or examples, a blank prompt box is a blank stare; the discovery problem is upstream of the answer quality | P3 |

**Riskiest assumption:** GA-3. Budget analysts work in a financial data model that doesn't overlap with EA data. If their real questions — "what does this system cost in FTE time?" "which contract expires next year?" — can't be answered, guided answers is useful only to architects, not to the personas it's targeting.

---

## Repository Modelling

Added 2026-05-26 for [#384](https://github.com/roballred/GovEA/issues/384). These assumptions sit underneath the repository&apos;s ability to be trusted at all &mdash; they affect every analysis surface, not just one feature.

| ID | Assumption | Persona | If wrong | Priority |
|----|-----------|---------|----------|----------|
| RM-1 | Enterprise Architects are willing to maintain capability-to-application linkage as an explicit, ongoing chore | Enterprise Architect (Central IT) | Linkages are entered once and rot. Every downstream confidence / impact / roadmap view inherits stale data and stakeholders silently lose trust. | P1 |
| RM-2 | Agency EA Coordinators recognise their agency&apos;s applications and services in the centrally-modelled catalogue | Agency EA Coordinator | Agency coordinators can&apos;t find their work in the central model and disengage. Federation features fail before they start. | P1 |
| RM-3 | The "completeness score" surfaced to admins is interpreted as a quality signal worth acting on, not vanity metrics | Enterprise Architect | Score is dismissed. The cleanup-action ranking is ignored. Repository drifts even when GovEA tells the architect exactly what to fix. | P1 |
| RM-4 | Domain Architects will accept ownership of a slice of the catalogue when that ownership is named, rather than treating EA work as central-IT&apos;s job | Domain Architect | Domain ownership defaults back to the central EA, who can&apos;t cover every domain, so coverage stays shallow. | P2 |
| RM-5 | "Capability" reads as an actionable concept to non-EA staff in government (not just to TOGAF-trained architects) | Agency EA Coordinator, Department Director | "Capability" is read as jargon or as a synonym for "feature" or "system" &mdash; the whole information model loses meaning to its primary stakeholders. | P2 |
| RM-6 | Enterprise Architects find value in seeing what other agencies have catalogued (cross-org visibility), and that visibility justifies the federation effort | Enterprise Architect, Agency EA Coordinator | Federation is built but never used. Single-org becomes the only mode anyone runs. | P3 |

**Riskiest assumption:** RM-1. Linkage rot is the failure mode that quietly invalidates every downstream surface. If maintaining linkages is too expensive for architects, GovEA degrades into a one-time-modelled directory, not a living architecture.

---

## Integration & Reconciliation

Added 2026-05-26 for [#384](https://github.com/roballred/GovEA/issues/384). These assumptions gate named connector work; pin them down before the first integration ships.

| ID | Assumption | Persona | If wrong | Priority |
|----|-----------|---------|----------|----------|
| IN-1 | Manual reconciliation between GovEA and an external system of record (CMDB, ITSM, budget) is the EA team&apos;s pain, not someone else&apos;s | Enterprise Architect, Programme Director | The pain lives in finance, ops, or a service-desk team that doesn&apos;t use GovEA &mdash; an EA-side integration solves the wrong team&apos;s problem. | P1 |
| IN-2 | Data drift between GovEA and the source system happens often enough that an automated freshness signal is meaningfully more useful than a "last synced" timestamp | Enterprise Architect, Agency EA Coordinator | Architects only need to reconcile occasionally; the connector becomes a nice-to-have rather than a must-have, and integration work over-indexes on a sporadic pain. | P1 |
| IN-3 | The right first integration target is the CMDB, not the ITSM, budget, or DevOps tool | Enterprise Architect | First connector is built against the wrong source of truth &mdash; reconciliation effort moves but doesn&apos;t reduce overall. | P1 |
| IN-4 | The agency has the political ability to ask the system-of-record team for read-access credentials &mdash; not just the technical ability | Programme Director, Agency EA Coordinator | Connector ships but can&apos;t be turned on in any real agency without an inter-team escalation that nobody wants to drive. | P2 |
| IN-5 | A push-based or webhook-driven integration is preferred over scheduled polling | Enterprise Architect | Implementation picks the wrong default; first pilots demand the opposite shape and the work is partly rebuilt. | P2 |
| IN-6 | When GovEA disagrees with a system of record, the architect believes GovEA &mdash; not the other system | Enterprise Architect | Integration becomes one-way reads only; GovEA is treated as the &ldquo;maybe&rdquo; copy and stops being authoritative for any cross-system question. | P3 |

**Riskiest assumption:** IN-1. If reconciliation pain lives in a non-EA team, an integration that ships into the EA UI is solving for the wrong audience even when it works technically.

---

## Cross-cutting risk

GA-1 and RT-1 share a structural assumption: that elected officials and budget staff use the tool themselves, not through a staff proxy. If the actual user is always a chief of staff or a budget aide, the UX decisions (reading level, question prompts, confidence labels) need to optimize for a different person than the named persona. This is the single most consequential thing to confirm or refute in interviews.

RM-1 and IN-2 share a structural assumption about **maintenance willingness**: that someone will keep linkages or sync signals current. If that maintenance work is too expensive in either case, the failure mode is the same &mdash; the data lies, and confidence surfaces lie with it. Test both in the same architect interview to keep travel/calendar cost low.
