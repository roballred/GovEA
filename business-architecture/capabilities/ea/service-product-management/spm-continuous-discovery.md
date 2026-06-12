# Capability: Continuous Discovery

## What It Does

Keeps the evidence from user research attached to the service it is about. Services already link to the personas they serve; this capability adds the discovery trail — research findings, validated or disconfirmed assumptions, and feedback — so "what do we know about how people experience this service?" has an answer that survives staff turnover and project closure.

In project-based delivery, user research happens once (if at all) during the build and is lost in a report. The product model treats discovery as continuous; the repository's job is to make accumulated evidence findable from the service record.

## Personas

- **Service Owner** — records findings and uses the evidence trail to justify roadmap choices
- **Agency EA Coordinator** — connects discovery evidence to personas, keeping the people-centered model honest
- **Business Stakeholder** — contributes observations from the front line of service delivery

## Behaviors

- Attach discovery evidence to a service: a dated finding, its source type (interview, observation, feedback, analytics), and the personas it concerns
- Distinguish confirmations from disconfirmations — a finding that contradicts a persona assumption is the most valuable record (mirroring the practice-fit feedback log's philosophy)
- Surface evidence staleness: a live service with no discovery evidence in N months is a signal
- Feed service-scoped entries from the in-product feedback capture (#103) into the same trail when that ships

## Rules

- Evidence entries are immutable in spirit: corrections append, they do not rewrite history
- Personally identifying details about research participants do not belong in the repository — findings are recorded at the persona level
- Evidence respects service visibility and federation rules
- Discovery evidence informs persona validation but does not flip a persona's Validation Status by itself — that remains an explicit decision per Standards.md

## Implementation Status

**Not implemented.** Services already junction to personas (shipped); the practice-fit feedback log exists as a repo-level markdown artifact, and in-product feedback capture is #103 (v1.0). No service-scoped evidence structures exist in the product. Gated on persona validation (#668) — with the irony noted that this capability is itself about making that kind of validation routine.

## Links

- Depends on: Portfolio — Services (po-services), Personas (po-capability-map persona linkage), feedback capture (#103)
- Enables: Outcome Measurement (spm-outcome-measurement) — discovery surfaces what to measure
- Related: business-architecture/feedback-log.md (practice-fit log), validation plan (docs/research/validation-plan.md)
