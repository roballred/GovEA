# AI-Enabled Development Standards

## Core Principle

Humans lead the work. AI is a capability amplifier, not the decision maker. Humans define intent, review outputs, own tradeoffs, and are solely responsible for merge decisions.

## EasyEA-Based Product and Architecture Definition

Use the [EasyEA framework](https://github.com/roballred/EasyEA) to define what should be built before implementation starts.

- Start with direction: business goals, problems to solve, guiding principles, and constraints.
- Develop personas for each distinct type of person affected by the product or process.
- Capture each persona's pain points, goals, system role, and critical insight.
- Derive capabilities from persona pain points and goals so every capability traces back to a real human need.
- Define capabilities as **what** the organization or product must be able to do, not **how** it will be implemented.
- Validate each capability using EasyEA criteria: stable over time, delivers business value, traceable to a persona, measurable, and specific enough for AI to design or build from.
- Keep personas and capabilities as living artifacts and update them as discovery, implementation, testing, and user feedback reveal new information.

### Persona Validation Status

Every persona must carry an explicit validation status:

- **Assumed** — drafted without direct user research. May be used to drive capability design but must not drive implementation until validated.
- **Validated** — confirmed through at least one interview or direct observation with a real user of that type.

Assumed personas must be flagged as such in the persona file. Implementation work that depends solely on assumed personas carries elevated risk and should be noted in the relevant issues.

### Capability Structure

Capabilities are organized hierarchically:

- **Capability group** — a top-level domain (e.g. IAM, Content Management). Represented by a parent file that lists all sub-capabilities in a table with descriptions and links.
- **Sub-capability** — a specific capability within a group. One file per sub-capability.

Capability groups should be organized by module or product area under `business-architecture/capabilities/`.

### Documentation Format

The structural format for persona and capability files — required sections, optional sections, link vocabulary, and naming conventions — is defined in [`business-architecture/STYLE.md`](business-architecture/STYLE.md). All persona and capability documentation must follow that format.

### Reference Sources vs. Capability Definitions

Reference sources (external frameworks, existing products, prior art used as inputs to capability design) must be clearly distinguished from capability definitions (the authoritative outputs of EasyEA work).

- Reference sources belong in `business-architecture/capabilities/` alongside capability files but must be named and labeled clearly as reference material (e.g. `orchardcore-capabilities.md`).
- Capability definition files are authoritative. Reference sources are not.
- If a reference source conflicts with a capability definition, the capability definition governs.

## Operating Standards

1. **Human-led execution**
   - A human owns the issue, defines acceptance criteria, and reviews all AI-generated changes before they are accepted.
   - AI may assist with implementation, refactoring, test generation, documentation, and analysis, but not final approval.

2. **Same code workflow for humans and AI**
   - AI tools must work through the same repository, branching, issue tracking, and pull request workflow as humans.
   - No bypassing source control, review, or traceability standards.

3. **Persona and capability traceability**
   - Issues, requirements, and implementation work should trace back to personas and capabilities developed through EasyEA.
   - If a feature or change cannot be tied to a persona pain point, persona goal, business goal, or validated capability, pause and clarify why it should exist.

4. **Issue-first development**
   - Work should begin from a tracked issue with clear scope and expected outcome.
   - Issues should reference the relevant persona(s), capability ID(s), and business goal when applicable.
   - Pull requests should reference the related issue and explain what changed, why, and how it was validated.

5. **Pull requests are required**
   - All code changes should be delivered through pull requests.
   - AI-generated code must be clearly reviewable in diffs, with no hidden or untracked changes.
   - Only humans merge pull requests.

6. **Testing is part of development, not an afterthought**
   - Every change should include appropriate tests or a clear rationale for why tests are not applicable.
   - Tests are the primary evidence that existing behavior was not broken and new behavior works as intended.
   - Tests should verify both technical correctness and whether the implemented capability satisfies the intended persona need and acceptance criteria.
   - AI can help write tests, but humans are responsible for confirming test quality and coverage.

7. **Review for correctness, maintainability, and risk**
   - Human review should evaluate not just whether the code works, but whether it fits the architecture, is understandable, secure, and maintainable.
   - Review should also confirm that the change still aligns to the intended persona, capability, and business goal.
   - If AI output is unclear, overcomplicated, or poorly aligned, it should be revised or rejected.

8. **Traceability and accountability**
   - Issues, commits, tests, and pull requests should form a clear record of what was changed and why.
   - The human owner remains accountable for the final result, regardless of how much AI assistance was used.

9. **Prefer small, reviewable changes**
   - Use AI to accelerate work, but keep changes scoped so humans can realistically review them.
   - Large AI-generated batches should be broken into smaller pull requests when possible.

10. **Security and data boundaries**
   - Do not share secrets, customer data, or restricted information with AI tools unless explicitly approved and safe to do so.
   - AI output should be reviewed for security, licensing, and compliance concerns before merge.

11. **AI is allowed to be wrong**
    - Treat AI output as a draft, not truth.
    - Verify assumptions against the codebase, tests, docs, and human judgment.

## Traceability Convention

Every issue, pull request, and commit that touches implementation should be traceable to a capability and persona. This section defines the lightweight convention used throughout this repository.

### Capability IDs

Sub-capabilities are identified by their file stem — the filename without `.md`:

```
business-architecture/capabilities/cms/iam/iam-user-management.md  →  iam-user-management
business-architecture/capabilities/cms/content-management/cm-content-authoring.md  →  cm-content-authoring
business-architecture/capabilities/ea/repository-modelling/rm-end-to-end-traceability.md  →  rm-end-to-end-traceability
```

This ID is stable as long as the file is not renamed. It is the reference used in issues, PRs, and commits.

Capability group parent files are referenced by their directory path:

```
business-architecture/capabilities/cms/iam/  →  cms/iam
business-architecture/capabilities/cms/content-management/  →  cms/content-management
```

### Issue format

Issues that implement a capability should include a `Capability:` line in the body:

```
Capability: iam-user-management
Persona: CMS Administrator
```

Multiple capabilities may be listed. Issues that span a group can reference the group instead:
```
Capability group: cms/iam
```

### Pull request format

PRs should reference the originating issue and the capability in the description:

```
Closes #42
Capability: iam-user-management
```

### Commit message format

For commits that implement or change a capability, include the capability ID in the message body or as a footer:

```
feat(iam): add user deactivation with last-admin guard

Capability: iam-user-management
Closes #42
```

This is a convention, not enforcement. The goal is a clear record of why each change exists — not compliance overhead.

---

## Backlog Tracks

Every open issue carries exactly one `track:*` label. Tracks group work by intent so the backlog can be prioritized and reviewed by purpose, not by date or component alone.

| Label | Meaning |
|---|---|
| `track:core` | Product capability or feature required for GovEA v1. New persona-facing functionality, capability additions, baseline UI surfaces, and the underlying data model. |
| `track:differentiator` | Capability that distinguishes GovEA from generic EA tools — typically EasyEA-grounded methodology surfaces (persona-first analysis, plain-language outputs, government-specific patterns, ARB simulation, maturity self-assessment). |
| `track:foundation` | Infrastructure, governance, standards, ARB findings, security hardening, test infrastructure, CI tooling, and process work that unblocks the other tracks. |

### Application rules

- Every new issue is triaged into a track before it is moved out of triage.
- A track is not permanent — re-label when scope changes.
- If a reviewer thinks an issue is mis-tracked, comment on the issue rather than silently re-labeling.

### Defaults

- "ARB:" prefixed issues, governance docs, CI work, security hardening, and test infrastructure default to `track:foundation`.
- New product capabilities and persona-facing features default to `track:core`.
- Surfaces that exist primarily because of the EasyEA framework or GovEA's government focus belong in `track:differentiator`. When uncertain, ask on the issue rather than guessing.

---

## Persona Journey Labels

Each of the 16 personas in `business-architecture/personas/` has a matching `journey:<persona-id>` label. The persona ID is the file stem (e.g. `journey:enterprise-architect` for `enterprise-architect.md`).

### What they mean

A `journey:<persona-id>` label attaches an issue to one persona's canonical end-to-end journey through GovEA. It is used to:

- Group gap issues filed during a persona journey audit (see `docs/persona-journeys/<persona-id>.md`) so all the friction one persona hits is reviewable as a set.
- Surface work that is attributable to a single persona's experience even when filed outside an audit (e.g. a UX issue that only the Elected Official journey encounters).

### When to apply

- Apply when an issue is specifically scoped to one persona's path through the product.
- Multiple `journey:*` labels are allowed when an issue legitimately blocks more than one persona; prefer this over filing duplicates.
- Do **not** apply to infrastructure, governance, or platform-wide work — those carry only a `track:*` label.

### Labels (16)

| Persona ID | Label |
|---|---|
| `agency-ea-coordinator` | `journey:agency-ea-coordinator` |
| `budget-performance-analyst` | `journey:budget-performance-analyst` |
| `business-stakeholder` | `journey:business-stakeholder` |
| `cms-administrator` | `journey:cms-administrator` |
| `cms-viewer` | `journey:cms-viewer` |
| `consultant-si` | `journey:consultant-si` |
| `data-modeler` | `journey:data-modeler` |
| `department-director` | `journey:department-director` |
| `domain-architect` | `journey:domain-architect` |
| `early-maturity-practice-lead` | `journey:early-maturity-practice-lead` |
| `elected-official` | `journey:elected-official` |
| `enterprise-architect` | `journey:enterprise-architect` |
| `enterprise-data-architect` | `journey:enterprise-data-architect` |
| `instance-administrator` | `journey:instance-administrator` |
| `junior-ea-analyst` | `journey:junior-ea-analyst` |
| `programme-director` | `journey:programme-director` |

When a persona file is added, renamed, or removed, the matching label is created, renamed, or deprecated in lockstep.

---

## Draft Workflow

1. Set direction using EasyEA: business goals, problems, principles, and constraints.
2. Develop personas and capture pain points, goals, roles, and critical insights. Mark each persona as **Assumed** or **Validated**.
3. Define and validate capabilities, then map each capability back to personas and business value.
4. **Run an ARB review** across the capability set before implementation begins. Each ARB reviewer surfaces gaps, risks, and blind spots from their domain perspective. Document all findings as tracked GitHub issues with severity, affected files, and recommended action. Resolve high-severity findings before proceeding.
5. Create or select an issue tied to the relevant persona(s), capability ID(s), and acceptance criteria.
6. Use AI to assist with implementation on a branch following the same repository and PR workflow as humans.
7. Run tests and add/update test coverage to prove the change works and did not break existing behavior.
8. Open a pull request linked to the issue and document what changed, why, what capability it supports, and how it was tested.
9. Human reviews code, tests, risk, and persona/capability alignment.
10. Revise as needed.
11. Human merges when satisfied.

## Business Architecture Folder Structure

All EasyEA artifacts live under `business-architecture/` in the repository root:

```
business-architecture/
├── personas/
│   └── [one .md file per persona]
└── capabilities/
    └── [module]/
        └── [capability-group]/
            ├── [capability-group].md        ← parent file listing all sub-capabilities
            └── [prefix]-[sub-capability].md ← one file per sub-capability
```

Reference sources used as inputs to capability design are stored alongside capability files but clearly labeled as reference material. They are not authoritative.

## ARB Finding Issue Format

Every ARB finding must be captured as a GitHub issue with the following structure:

```
Title: ARB: [short description of the gap]
Labels: arb-finding, severity:high | severity:medium, design

Body:
## ARB Finding — [Reviewer Name] ([Reviewer Role])
**Severity:** High | Medium
**Mode:** Standard | Red Team | etc.

## Problem
[What is missing or wrong]

## Specific Gap
[Bullet list of specific files or decisions affected]

## Recommended Action
[What should be done to close the gap]

## Affected Files
[List of file paths]
```

High-severity ARB findings must be resolved before implementation begins on the affected capabilities.

## AI Tool Context Files

Standards.md is the canonical source of project intent for all AI tools.

Tool-specific context files should reference and extend Standards.md, not replace it:

| Tool | File |
|---|---|
| Claude Code | `CLAUDE.md` |
| OpenAI Codex | `AGENTS.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |

Tool files may contain tool-specific behavior, workflows, or project structure detail. They must not contradict the principles in Standards.md. If they conflict, Standards.md governs.
