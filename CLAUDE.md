# GovEA — Project Instructions for Claude

> **Governing document:** [Standards.md](./Standards.md) defines the principles, workflow, and traceability requirements for all AI-assisted work on this project. This file extends those standards with Claude-specific context. If anything here conflicts with Standards.md, Standards.md governs.

## What This Is

GovEA is a free, open source enterprise architecture tool built specifically for state and local government.

Built on the [EasyEA](https://github.com/roballred/EasyEA) methodology — people-centered, lightweight, designed for everyday work rather than compliance theater.


---


## EasyEA Reference

The methodology behind GovEA lives at https://github.com/roballred/EasyEA. Key concepts:
- People-centered: start with personas, not systems
- 7-step lightweight workflow
- ARB review with 10 distinct reviewer personas (simulated in v2)
- Plain-language outputs for elected officials and non-technical stakeholders

---




## User Roles

| Role | Access |
|---|---|
| Admin | Full access — users, org settings, all content |
| Contributor | Create and edit EA content — no user management, no delete |
| Viewer | Read-only, published content only |

SSO users default to Viewer. Admins promote as needed.

---

## Required Workflow (no exceptions)

Standards.md §4–5 require this sequence for every code change. Do not skip steps.

1. **Create a GitHub issue** — include title, labels, persona/capability traceability, and acceptance criteria before writing any code
2. **Create a branch** — `feature/issue-N-short-description` or `fix/issue-N-short-description`
3. **Implement** — on the branch, following Standards.md
4. **Commit** — reference the issue number (e.g. `closes #N`)
5. **Open a PR** — link to the issue, document what changed, why, and how it was tested

If you cannot create an issue (e.g. no GitHub access), draft the full issue body and stop — do not proceed to implementation until the issue exists.

---

## GitHub

Repo: https://github.com/roballred/GovEA
