# Practice-Fit Feedback Log

**Phase 1 of [#103](https://github.com/roballred/GovEA/issues/103), activated by [#384](https://github.com/roballred/GovEA/issues/384).**

Running log of practice-fit issues heard from real users &mdash; things in GovEA that don&apos;t fit how their team actually works. Manually maintained until #103 Phase 2 ships the in-app affordance.

This log captures **disconfirmation evidence**. A row here is more valuable than a row in the persona file claiming everything was confirmed.

---

## How to use

### When to log

- Any time a real user (interview subject, demo viewer, pilot partner, friendly reviewer) says something that contradicts a persona claim, a feature behaviour, or an assumption in [`docs/research/stakeholder-assumption-register.md`](../docs/research/stakeholder-assumption-register.md).
- Any time a stakeholder asks for something GovEA can&apos;t do that we expected them to expect.
- Any time someone&apos;s mental model of an EA concept (capability, initiative, traceability, roadmap, confidence) materially differs from ours.

### When not to log

- Bug reports. File a GitHub issue.
- Feature requests with no underlying assumption story. File a GitHub issue.
- Internal-team opinions about UI polish. Use the regular PR review path.

### Cadence

Reviewed at every backlog grooming pass. Rows older than two grooming cycles are either:
- **Acted on** &mdash; an issue or capability-doc change exists that addresses the feedback, link it in the &ldquo;Action / decision&rdquo; column.
- **Parked** &mdash; explicitly recorded as &ldquo;not changing behaviour&rdquo; with a reason.
- **Stale** &mdash; if the relevant feature has materially changed since the row was written, mark the row as superseded and link to a follow-up row if one exists.

---

## Scope (initial focus)

#384 scopes Phase 1 logging to recently-shipped analysis and reporting surfaces. Until that scope expands, target feedback on:

| Surface | Why it&apos;s in scope |
|---|---|
| Executive Summary (`/executive`) | Stakeholder-facing report; persona claims are densest here |
| Heatmap Analysis | Risk-portfolio view that depends on Repository Confidence labels |
| Impact Analysis (Application + Capability detail pages) | Decommission-consequence assumptions, RM-1 / RM-3 territory |
| Capability Map + Mermaid diagram | RM-2 / RM-5 territory; recognition + jargon questions |
| Guided Answers (`/answers?q=`) | GA-1/GA-3/GA-5 entire stack |
| Repository Confidence Summary | RC-1 through RC-5 |
| Roadmap Timeline (`/roadmap`) | RT-1 through RT-5 |
| Stakeholder traceability views | RM-2, RT-5 |
| In-app product Overview (`/overview`) | New stakeholder landing; confirm or disconfirm whether it actually orients first-time reviewers |

When a row is logged against a surface outside this list, the row still counts &mdash; the scope is a focus, not a filter.

---

## Log

Newest first. Add new rows at the top of the table.

| Date | Source persona | Feature / context | What didn&apos;t fit | Severity | Action / decision |
|---|---|---|---|---|---|
| _(empty)_ | _(awaiting first conversation)_ | _(see validation plan)_ | _(see validation plan)_ | _(P1 / P2 / P3)_ | _(link to GitHub issue or short note)_ |

---

## Notes on the columns

- **Date** &mdash; conversation date, not date logged.
- **Source persona** &mdash; the persona profile the source fits, not a name. Use the persona file stem (e.g. `enterprise-architect`, `elected-official`). One row per distinct piece of feedback even if the same conversation produced several.
- **Feature / context** &mdash; the GovEA surface the feedback is about, or `(general)` if it&apos;s broader. Use route names (`/executive`) where possible.
- **What didn&apos;t fit** &mdash; one or two sentences describing the gap. Quote where the words matter.
- **Severity** &mdash; rough triage. P1 if it likely changes a feature&apos;s value proposition; P2 if it degrades; P3 if it&apos;s friction.
- **Action / decision** &mdash; either a GitHub issue link, a capability-doc / persona-doc commit reference, or an explicit &ldquo;not changing &mdash; reason&rdquo; note.

---

## Aging policy

When a row has been on this log for more than three months without an action or decision recorded, raise it in the next product-priorities grooming pass. Stale unacted feedback is itself a signal &mdash; either the disconfirmation didn&apos;t matter, or the team is dodging it.