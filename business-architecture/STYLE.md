# Business Architecture Documentation Style

This file defines the format standard for persona and capability documentation under `business-architecture/`. It is a companion to [Standards.md](../Standards.md), which establishes the underlying EasyEA principles. If they conflict, Standards.md governs the principle and this file governs the format.

The standard exists so newer files do not drift from older ones, AI-assisted work has a single template to follow, and reviewers have an objective compliance check.

---

## Persona Files

Persona files live in `business-architecture/personas/` — one file per persona. Filename uses kebab-case (e.g. `agency-ea-coordinator.md`).

### Required structure

```markdown
# Persona: <Persona Name>

**Validation Status: Assumed|Validated** — <one-sentence rationale: how the persona was drafted, and what would move it to Validated>

## Role Type
<short phrase: Internal | External | both, plus broad role family>

## Who They Are
<one or two paragraphs describing the persona in plain language>

## Goals
- <bullet list of what this persona is trying to accomplish>

## Pain Points
- <bullet list of what currently frustrates them>

## Critical Insight
<one short paragraph capturing the single non-obvious truth that would change a designer's mind about how to serve this persona>

## Relevant Capabilities
- <bullet list of capabilities (or capability groups) this persona depends on>
```

### Optional sections (use when applicable)

- `## Government Equivalent` — what an equivalent role looks like in state/local government (recommended for technical roles where the title varies between private and public sector)
- `## Distinction from <Other Persona>` — small comparison table to disambiguate when two personas could be confused
- `## Data Stored About This Persona` — for personas that map to system users (RBAC roles); describes what data the product stores about them

### Validation Status rules

Per Standards.md every persona must declare a status. Two values are allowed:

- **Assumed** — drafted without direct user research. May drive capability design but must not drive implementation
- **Validated** — confirmed through at least one interview or direct observation with a real user of that type

The rationale sentence after the status is required and should describe how the persona was drafted and what evidence would move it to Validated.

### What not to include

- A `## Most Valuable Capabilities` section. The canonical heading is `## Relevant Capabilities`. Two terms for the same content cause drift.
- RBAC role definitions. Personas describe people; roles describe access. Document roles in `business-architecture/capabilities/cms/iam/`.

---

## Capability Group Files

Capability group files are the parent file at the root of each group folder. Filename matches the folder name (e.g. `business-architecture/capabilities/cms/iam/iam.md`).

### Required structure

```markdown
# Capability: <Group Name>

## What It Does
<one or two paragraphs explaining what this capability group enables in plain language>

## Personas
- **<Persona Name>** — <one-line description of this persona's relationship to the group>

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| <Sub-cap name> | [<prefix>-<slug>.md](./<prefix>-<slug>.md) | <one-line description> |

## Success Criteria
- <bullet list of 3–5 outcome statements: "indicates this group is working well after deployment">

## Rules
- <bullet list of group-wide invariants — what must always be true>

## Implementation Status
<short paragraph or bulleted list distinguishing what is shipped today, partial, or not yet implemented>

## Links
- Depends on: <other capability group(s)>
- Enables: <other capability group(s)>
- Related: <other capability group(s)>
```

### Optional sections (use when applicable)

- `## Out of Scope` — capabilities that look adjacent but are intentionally excluded
- `## Deferred to v2` (or later) — capabilities planned but not in v1
- `## Design Principle` — short statement explaining the philosophy behind the group
- `## Reference Sources` — external frameworks the group draws on (TOGAF, DAMA, etc.)
- `## Upgrade & Migration` — operator-facing guidance for groups with persistent state
- `## Capabilities Covered Elsewhere` — when work that would naturally land here is intentionally housed in another group

### Status section naming

The canonical heading for current state is `## Implementation Status`. Do not use `Current Scope`, `Current State`, `Current Maturity`, or other variants. Single name keeps lint and search reliable.

### Scope field

Group parent files declare a release-scope signal so non-technical readers (Department Director, Elected Official) can tell what is in v1 vs deferred without parsing every capability doc. The field lives immediately under the H1, before `## What It Does`:

```markdown
# Capability: <Group Name>

**Scope:** v1
```

Allowed values:

- **v1** — included in the v1 release.
- **v2** — planned for a later release. Use sparingly; "future work" is also documented in `## Deferred to v2` when it earns more detail.
- **out of scope** — intentionally excluded. **Required:** add a rationale on the same line, e.g. *"out of scope — replaced by external IdP; see ADR-007."* No silent out-of-scope declarations.

Sub-capability (leaf) files may carry a `Scope:` field when they meaningfully deviate from their parent group's scope (e.g. parent is v1 but one leaf is v2). When the leaf's scope matches its parent, the field is optional.

The lint does not enforce Scope today — backfill is an explicit content decision. If enforcement is added later it will apply to group parents first.

---

## Sub-Capability Files

Sub-capability files live alongside the group file in the same folder. Filename uses the group prefix followed by a slug (e.g. `iam-user-management.md`, `cm-content-authoring.md`, `rm-end-to-end-traceability.md`).

### Required structure

```markdown
# Capability: <Sub-capability Name>

## What It Does
<short paragraph explaining what this sub-capability enables>

## Personas
- **<Persona Name>** — <one-line description>

## Behaviors
- <bullet list of what the system does to deliver this sub-capability>

## Rules
- <bullet list of invariants for this sub-capability>

## Implementation Status
<short paragraph or bulleted list. Required even when status is "Planned — not yet implemented">

## Links
- Depends on: <other sub-capability or group>
- Enables: <other sub-capability or group>
- Related: <other sub-capability or group>
```

### Optional sections (use when content earns its keep)

Examples seen in the repo and accepted as optional:

- Domain-specific tables — `State Definitions`, `Retention Policy`, `Data Classification Field`, `Seeded Domain Values`, `Federation Behavior`, `Security Classification Guidance`
- Reference material — `Default Government Domain Taxonomy`, `Core Relationship Rules (GovEA)`

These are allowed when the sub-capability genuinely needs them. Do not add empty placeholders.

---

## Capability ID Convention

Per Standards.md, capability IDs are file stems (filename without `.md`):

- Sub-capability ID: `iam-user-management`, `cm-content-authoring`, `rm-end-to-end-traceability`
- Capability group ID: directory path, e.g. `cms/iam`, `ea/repository-modelling`

Use these IDs verbatim in:

- Issue bodies: `Capability: iam-user-management`
- PR descriptions: `Capability: iam-user-management`
- Commit message footers: `Capability: iam-user-management`

---

## Link Vocabulary

The `## Links` section uses three labels, no others:

- **Depends on:** — this capability cannot work without the linked capability
- **Enables:** — this capability is required for the linked capability to work
- **Related:** — this capability shares concepts or context with the linked capability but neither depends on the other

Do not invent new labels (`Pairs with`, `See also`, `Sometimes uses`, etc.). The vocabulary is intentionally narrow.

Link targets may be either capability group IDs (e.g. `IAM`, `Content Management`) or sub-capability IDs (e.g. `iam-user-management`). Free-form text is allowed when the target is not yet a capability file.

---

## What This Standard Does Not Cover

This file standardizes format, not content quality. It does not enforce:

- Whether a capability is well-scoped (that is an EasyEA validation question — see Standards.md)
- Whether `What It Does` is genuinely user-facing rather than implementation-leaking
- Whether `Implementation Status` is honest about what is shipped vs. planned

Those are review judgments. The standard makes drift visible; reviewers still own substance.

---

## Architecture-Decision Files

Some capability folders host inline architecture-decision records (e.g. `iam-api-auth-decision.md`, `rm-query-performance-decision.md`) for proximity to the capability they constrain. These follow ADR conventions, not the sub-capability template above. Filename suffix `-decision.md` marks them; the lint script skips them. Use them when the decision is small enough to live inside the capability folder; otherwise file under `docs/decisions/`.

## Compliance and Enforcement

Compliance is enforced by [`scripts/lint-business-architecture.mjs`](../scripts/lint-business-architecture.mjs), wired into CI. Run locally with `node scripts/lint-business-architecture.mjs`.

When adding or editing a persona or capability file:

1. Read the existing file before editing — patch in place, do not rewrite from scratch
2. Confirm the file matches the structure above
3. Use the canonical heading names
4. Use the canonical Link vocabulary
5. Do not add empty sections — omit optional sections when there is nothing real to say
