# Persona Journey — Elected Official

**Persona file:** [`business-architecture/personas/elected-official.md`](../../business-architecture/personas/elected-official.md)
**Capability anchors:** [`frontend-display`](../../business-architecture/capabilities/cms/frontend-display/) group — `fd-executive-roadmap-timeline`, `fd-traceability-views`, `fd-application-risk-portfolio`, `fd-repository-confidence-summary`, `fd-guided-answer-views`, `fd-public-authenticated-views`.
**Walk audited:** 2026-05-19 — fifth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #546](https://github.com/roballred/GovEA/issues/546))
**Persona validation status:** Assumed (not yet validated with real elected officials, chiefs of staff, or equivalent public-sector decision-makers).

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `victor@govea.dev` (Riverdale Viewer — the closest dev-seed proxy for a non-author, read-only persona; intentionally not surfaced as a dev shortcut per the seed comment, so used the credentials form directly).

This is the first walk where the persona is **fundamentally not an authoring user**. The persona file's critical insight — *"This persona does not want an EA tool. They want a trusted visual explanation."* — frames the walk's emphasis: how well does the system serve a non-technical, time-poor reader who shouldn't have to learn the data model?

## Canonical journey

1. Try to view content without signing in.
2. Sign in as a Viewer.
3. Open Executive Summary (`/executive`).
4. Open Roadmap (`/roadmap`).
5. Open Mission-to-Technology Traceability (`/traceability`).
6. Use Guided Answers to ask "what supports permitting?"-style questions (`/answers`).
7. Open Applications Portfolio risk view (`/applications` → Portfolio toggle).
8. Look for Repository Confidence cues across surfaces.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Public access | **Blocked (by design, v1)** | Middleware enforces auth on every route. `fd-public-authenticated-views.md` documents this as a v1 deferral. Persona-blocking gap. [#547](https://github.com/roballred/GovEA/issues/547). |
| 2 | Sign in as Victor | **Works (with friction)** | Credentials form works once you type the right values, but Victor has no dev shortcut. A real elected official wouldn't sign in at all. Coupled to [#547](https://github.com/roballred/GovEA/issues/547). |
| 3 | Executive Summary | **Works very well** | Plain-language section labels (ACTIVE APPLICATIONS, COVERAGE GAPS, PORTFOLIO CURRENCY), big readable numbers, "actively maintained" confidence badge inline, recent updates feed, application portfolio sparkline. Exactly what the persona needs. Screenshot embedded in the PR. |
| 4 | Roadmap | **Works very well** | Timeline + Grid toggle. Each initiative shows business-impact description, time window (Q1 FY2026 → Q4 FY2026), status badge (Underway / Complete), linked capabilities with impact labels (improve / extend), and the strategic objective it serves. Confidence badge present. |
| 5 | Traceability | **Blocked at top level** | `/traceability` bare URL 404s — the page requires `?from=<type>&id=<id>` and is only reachable as a drill-down from another entity. No top-level entry from sidebar or any stakeholder-facing surface. Gap [#549](https://github.com/roballred/GovEA/issues/549). |
| 6 | Guided Answer | **Works (with detour)** | `/answers` itself has no input field — it just shows example prompts. Real flow routes through `/search` → results → "Get guided answer →" → `/answers?q=<query>`. The assembled answer view is excellent (plain-language, structured by Capabilities/Services/Applications/etc., "Why relevant" reasoning on each item). Detour through `/search` is awkward, and the section heading reads "**Capabilitys**" (typo). Gap [#550](https://github.com/roballred/GovEA/issues/550). |
| 7 | Applications portfolio | **Works** | The Portfolio toggle on `/applications` surfaces plain-language risk cards: "2 applications retiring while still supporting active capabilities — review or re-map before decommission." Matches `fd-application-risk-portfolio`'s documented v1 scope. |
| 8 | Repository confidence | **Works (multi-surface)** | The "actively maintained · Last updated May 2026" badge appears on `/dashboard`, `/executive`, and `/roadmap`. Plain-language, current, no internal jargon. Implements `fd-repository-confidence-summary` cleanly. |

**Tally:** 4 works · 1 works-with-friction · 1 works-with-detour · 1 blocked · 1 blocked-by-design.

## Findings

### Gaps filed

| Issue | Severity | Summary |
|---|---|---|
| [#547](https://github.com/roballred/GovEA/issues/547) | **High** (persona-foundational) | No public-read access. Persona's critical insight ("does not want an EA tool") is directly contradicted by mandatory login. |
| [#548](https://github.com/roballred/GovEA/issues/548) | **High** (persona-foundational) | Viewer role lands on the same admin dashboard as Admin / Contributor. Density and EA-jargon nav defeat the persona's "concise, visual, plain-language" expectation. Pair with nav simplification for Viewer role. |
| [#549](https://github.com/roballred/GovEA/issues/549) | Medium | `/traceability` bare URL 404s. Mission-to-tech tracing is reachable only as a drill-down. No top-level entry. |
| [#550](https://github.com/roballred/GovEA/issues/550) | Low (small bugs) | `/answers` has no direct input — flow detours through `/search`. Search results heading reads "Capabilitys" (typo). |

### What works very well — worth preserving in any redesign

- **Executive Summary** is the strongest persona-fit surface in the product. Plain-language labels, big numbers, color highlights for "needs attention" items, sparkline portfolio breakdown. This is what the rest of the Viewer experience should look like.
- **Roadmap** with its timeline + impact-language framing is similarly strong. Initiative cards lead with business impact, not internal project names — exactly what `fd-executive-roadmap-timeline` rule #2 requires.
- **Guided Answer** (`/answers?q=...`) assembles a stakeholder-briefing-ready view with "Why relevant" reasoning per item. The output is excellent; only the *entry path* needs work.
- **Repository Confidence** is rendered uniformly across `/dashboard`, `/executive`, `/roadmap` as a small, non-intrusive trust signal — matches the capability rule "plain-language labels are the default."

### Capability-doc hygiene observation

Most `frontend-display` capability files lack `## Implementation Status` sections — only `fd-application-risk-portfolio.md` includes one. From this walk I'd note implementation status as:

| Capability | Implementation status (observed) |
|---|---|
| `fd-executive-roadmap-timeline` | v1 implemented |
| `fd-application-risk-portfolio` | v1 implemented (already documented) |
| `fd-guided-answer-views` | v1 implemented (entry path needs polish) |
| `fd-repository-confidence-summary` | v1 implemented |
| `fd-traceability-views` | v1 partial — drill-down only, no top-level entry |
| `fd-public-authenticated-views` | v1 deferred (already documented) |
| `fd-content-display`, `fd-navigation`, `fd-portfolio-views`, `fd-relationship-navigation`, `fd-responsive-layout`, `fd-theming`, `fd-value-streams` | Not exercised in this walk; check during the next reader-side walk (`cms-viewer`) |

Worth a follow-up docs PR to backfill Implementation Status across the group. Same hygiene observation as the CMS Administrator walk ([#526](https://github.com/roballred/GovEA/issues/526)). Not filed separately — the pattern is clear; the fix is a backfill pass when convenient.

### Persona-validation note

Persona is still **Assumed**. The big-picture finding from this walk is that GovEA has the *content* an elected official needs (`/executive`, `/roadmap`, `/answers`) but the *access model* (mandatory login, admin-shaped dashboard, drill-down-only navigation) gates that content behind expectations the persona will not meet. Whether real elected officials actually want what `/executive` shows is the validation question — but the current build is structurally incompatible with the persona even if the content turns out to be right.

## Recommended follow-up

1. **[#547](https://github.com/roballred/GovEA/issues/547) (public access) and [#548](https://github.com/roballred/GovEA/issues/548) (Viewer landing) are paired prerequisites.** Neither alone unlocks the persona. Together they convert the existing strong surfaces (`/executive`, `/roadmap`, `/answers`) from "buried behind a login and an admin dashboard" to "the first thing the persona sees." Highest-leverage Phase 1 differentiator work.
2. **[#549](https://github.com/roballred/GovEA/issues/549) and [#550](https://github.com/roballred/GovEA/issues/550) are smaller polish items** that can ride along with the larger Viewer redesign.
3. **Next persona walk: `cms-viewer`.** That walk will exercise the read-only paths that this walk skipped (`/personas`, `/services`, `/glossary`, persona/capability detail-page reading without edit affordances). It will also confirm or contradict the Viewer-role assumptions in this walk by exercising the same surfaces from a different read-only lens.
