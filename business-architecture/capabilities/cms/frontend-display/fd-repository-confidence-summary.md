# Capability: Repository Confidence Summary

## What It Does
The system must present a concise, plain-language summary of how trustworthy and current the published repository is, so stakeholders can judge whether to rely on the content without seeing internal maintenance details.

## Personas
- **Department Director** — needs to know whether the repository is current enough to trust in planning and oversight
- **Elected Official** — needs a confidence cue before using the output in a briefing or decision context
- **CMS Administrator** — needs a publishable confidence summary that does not expose internal draft or quality backlog details

## Behaviors
- Display a summary status such as `actively maintained`, `under development`, or `getting started`
- Optionally pair the summary with a short admin-authored narrative that explains the current confidence level in plain language
- Show freshness signals such as most recent review or update date in a non-technical way
- Allow the summary to appear alongside major stakeholder-facing visuals such as roadmap, traceability, and portfolio views

## Rules
- The stakeholder-facing summary must never expose draft-only details, incomplete object lists, or internal remediation queues
- Plain-language labels are the default; raw percentages are optional and should remain secondary
- The summary must be suppressible when repository quality falls below an admin-defined threshold
- Confidence messaging must describe repository currency and completeness, not system uptime or infrastructure health

## Links
- Depends on: Repository & Modelling — Repository Completeness, Front-end Display — Content Display
- Related: Front-end Display — Portfolio Views, Executive Roadmap Timeline
