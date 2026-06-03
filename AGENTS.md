# GovEA — Project Instructions for OpenAI Codex

> **Before any work, read CLAUDE.md, Standards.md, and docs/AI-SESSION-START.md — they are authoritative and override this file. If this file conflicts with them, they govern.**

This file is a Codex-specific pointer and guardrail layer. It does not replace the project operating policy, traceability rules, database workflow, or governing AI standards.

## Required Reading Order

1. [`Standards.md`](./Standards.md) — governing document for AI-assisted work, EasyEA traceability, personas, capabilities, issue-first development, and PR review.
2. [`CLAUDE.md`](./CLAUDE.md) — operational policy for GovEA, including the database workflow, required pre-flight checklist, and commit/PR traceability format.
3. [`docs/AI-SESSION-START.md`](./docs/AI-SESSION-START.md) — canonical session bootstrap with current workflow, CI, GitHub CLI, deployment, and drift-prone operating policies.

Read those documents before editing files, running mutating commands, creating branches, or opening PRs.

## Branch & PR Hygiene (required)

- Always start from current origin/main; never reuse or revive an existing branch.
- A PR behind main at open time must be rebased onto main before review; if it can't cleanly rebase, start over from main.
- One concern per PR. Never bundle unrelated changes.
- Never reopen or re-push a closed PR or deleted branch. If closed work is still needed, open a NEW branch off current main and a NEW PR.
- Check before writing: search main for an existing implementation before adding a feature; if it already exists, stop.
- Schema changes use `db:push` + `src/db/sql/*.sql` (apply-triggers). NEVER create `apps/govea/src/db/migrations/` — that directory is drift; delete it if it appears.

## Pre-Flight Checklist

Before writing code or docs, complete the full checklist in [`CLAUDE.md`](./CLAUDE.md):

- Confirm a GitHub issue exists with clear scope.
- Confirm the issue has a `Capability:` or `Capability group:` line using the relevant EasyEA capability ID from `business-architecture/capabilities/`.
- Confirm the issue names the persona(s) served.
- Confirm acceptance criteria are clear enough to know when the work is done.

If the task arrives informally, create the issue first and confirm its content before implementing. If no capability doc fits, say so explicitly in the issue instead of inventing a capability ID.

## Traceability Requirements

Every implementation commit must include the capability ID and issue reference in the message body:

```text
Capability: <capability-id>
Closes #<issue-number>
```

Every PR description must include:

- `Closes #<issue-number>`
- `Capability: <capability-id>` or `Capability group: <group>`
- `Persona: <persona>`
- What changed, why it changed, and how it was verified

Use [`CLAUDE.md`](./CLAUDE.md) for the full required format. Traceability is part of the product governance model, not optional PR decoration.

## Scope Discipline

Keep each branch and PR focused on the issue being closed. Do not include opportunistic fixes, unrelated refactors, generated migrations, deployment topology, local environment files, or cleanup that belongs in a separate issue.

Before opening a PR, verify the diff contains only intended files. If unexpected files appear, stop and remove them from the branch before pushing.
