# Visual Regression Plan

**Status:** Defined &mdash; **implementation deferred to post-v1.0** per [#119](https://github.com/roballred/GovEA/issues/119).

This document defines how GovEA will catch unintended UI regressions when the design is locked enough to make screenshot diffing useful. It exists so the team has an agreed approach ready &mdash; tooling chosen, surfaces named, viewports decided, baseline-management discipline written down &mdash; the day implementation starts.

Companion to [`docs/test-coverage-targets.md`](./test-coverage-targets.md) (the other &ldquo;define now, enforce post-v1.0&rdquo; testing doc).

---

## Why implementation is deferred

Per [#119](https://github.com/roballred/GovEA/issues/119):

> Post v1.0 &mdash; this is premature until the UI is stable. The component structure and styling are still actively changing. Revisit when the design is locked and a theming/customization system is in place. Likely pairs well with the planned object/theme customization architecture.

Adding screenshot baselines today would generate a noisy snapshot diff on every PR that touches the UI &mdash; and we&apos;re touching it constantly (overview slices, viewer landing iterations, authoring guardrails, role-aware components). The failure mode is predictable: contributors learn to update snapshots reflexively, the diff stops being a useful signal, and the test becomes drag without value.

The agreement: don&apos;t enable the gate until the cost of breaking it is lower than the cost of ignoring it.

---

## Tooling choice

**Playwright `expect(page).toHaveScreenshot()`.**

Considered alternatives:

| Tool | Why we didn&apos;t pick it |
|---|---|
| **Chromatic** | Excellent product, but requires Storybook. GovEA has no Storybook today; adopting one would couple this work to an unrelated infra change. |
| **Percy** | Similar shape to Chromatic; same Storybook coupling and additional vendor dependency. |
| **Custom puppeteer + pixelmatch** | Reinvents what Playwright already does, including the diff viewer in the HTML report. |

Playwright is already in the stack for E2E smoke and overview specs. Visual regression piggybacks on the same `webServer`, the same global setup, the same auth states, the same CI runner.

---

## Initial surface inventory

When implementation starts, the **first five surfaces** (per #119&apos;s &ldquo;~5 key pages&rdquo; recommendation):

| # | Surface | Route | Reason |
|---|---|---|---|
| 1 | Login page | `/login` | Public-facing, infrequent visual change, dev-shortcut buttons in DEMO_MODE worth catching |
| 2 | Dashboard (Admin) | `/dashboard` | Most-used post-login surface; composes notification badge, completeness summary, dark-mode header |
| 3 | Capability detail (published, with linked applications + personas) | `/capabilities/[id]` | Representative content surface with relationship panels, prose markdown, breadcrumbs |
| 4 | Executive Summary (Admin) | `/executive` | Stakeholder-facing report; layout is dense and easy to break |
| 5 | Overview (Viewer) | `/overview` | Post-#614 stakeholder landing; viewer role exercises role-gated CTAs and the priorities tile |

Each surface gets a screenshot at two viewports: **Desktop Chrome** (existing) and a **mobile preset** (probably `devices['Pixel 5']`). 10 baseline images total at first.

Future additions will follow the same gate: don&apos;t add a baseline until the surface is stable enough that the next 30 days of PRs won&apos;t each require a snapshot update.

---

## Baseline management discipline

The discipline matters more than the tooling.

### When to add a baseline

A surface earns a baseline when **all three** are true:

1. The visual design is settled (no in-flight design issue against the surface).
2. The surface has shipped to `main` and survived at least one grooming cycle without a layout change.
3. There is a real persona who reads the surface and would notice if it changed unexpectedly.

### When to update a baseline

Only ever via an explicit human decision in a PR description. **Never** via &ldquo;the test was failing so I updated the snapshot.&rdquo;

The PR that intentionally changes the visual layout of a surface must:

- Explain in the description what changed visually and why
- Update the baseline screenshot in the same commit as the implementation
- Show the before/after in the PR (Playwright&apos;s HTML report does this automatically &mdash; attach the artefact)

The PR that *unintentionally* changes the visual layout must roll back the change, not update the baseline.

### When to delete a baseline

When the surface is removed or replaced. The baseline for a deleted route is dead weight; remove it in the same PR that removes the route.

### Cross-platform baseline stability

Playwright screenshots are pixel-sensitive to font rendering and antialiasing differences between OSes. Baselines must be generated **only on the CI Linux runner**, not on a maintainer&apos;s macOS or Windows machine. The discipline: regenerate via a CI run, commit the artefacts that come back &mdash; never generate baselines locally.

---

## Test layout (when implementation lands)

```
apps/govea/tests/e2e/
├── specs/
│   ├── smoke.spec.ts            # existing — HTTP health
│   ├── overview.spec.ts         # existing — role-gated CTAs
│   ├── iam.spec.ts              # existing — user lifecycle (state-mutating, not in CI)
│   ├── auth-security.spec.ts    # existing — auth gates (state-mutating, not in CI)
│   └── visual.spec.ts           # NEW — `expect(page).toHaveScreenshot()` per surface above
└── __screenshots__/             # NEW — baseline images, committed to git, regenerated only on CI
```

`playwright.config.ts` gets a second project entry for the mobile viewport. The visual spec runs against both projects automatically.

---

## CI wiring (when implementation lands)

Visual regression joins the existing `E2E smoke tests` job:

```yaml
- name: Run E2E smoke tests
  run: pnpm --filter govea exec playwright test \
    tests/e2e/specs/smoke.spec.ts \
    tests/e2e/specs/overview.spec.ts \
    tests/e2e/specs/visual.spec.ts
```

On failure, the existing &ldquo;Upload Playwright report&rdquo; step already captures the HTML report with embedded screenshot diffs. No new infra needed.

---

## When to enable

Per #119:

> Revisit when the design is locked and a theming/customization system is in place.

The signal to enable: **v1.0 closes with the dashboard, executive summary, capability detail, login, and overview surfaces unchanged for 4 weeks.** That&apos;s the &ldquo;design is locked&rdquo; proxy for these five surfaces specifically.

Enabling earlier than that means accepting that the first baseline will be wrong within days. Enabling later than that is fine &mdash; this doc isn&apos;t a deadline.

---

## Anti-patterns this document rejects

- &ldquo;Add screenshots for every page, baseline whatever Playwright captures.&rdquo; Wrong default; baselines are a commitment, and committing to surfaces still in design churn destroys the signal.
- &ldquo;Run `playwright test --update-snapshots` whenever the screenshot test fails.&rdquo; This converts the test from a signal into noise. Update snapshots only in PRs that intentionally change visual layout.
- &ldquo;Generate baselines locally on the maintainer machine; CI uses them.&rdquo; Font-rendering differences guarantee perpetual diff churn. Baselines come from CI runs.
- &ldquo;Visual regression replaces accessibility / interaction testing.&rdquo; Different categories. Visual regression catches layout drift; it does not catch broken keyboard navigation or missing aria attributes. Both matter.
- &ldquo;A failing snapshot is always a bug.&rdquo; A failing snapshot is always a *signal* worth investigating. Sometimes the signal is &ldquo;the test is stale and needs updating in this PR&rdquo;; sometimes it&apos;s &ldquo;you broke the UI by accident.&rdquo;

---

## Related

- [`docs/test-coverage-targets.md`](./test-coverage-targets.md) &mdash; companion &ldquo;define now, enforce post-v1.0&rdquo; testing doc
- [`apps/govea/tests/e2e/specs/`](../apps/govea/tests/e2e/specs/) &mdash; existing Playwright specs the visual spec will sit alongside
- [`apps/govea/playwright.config.ts`](../apps/govea/playwright.config.ts) &mdash; the config that will gain a mobile-viewport project
- [`Standards.md`](../Standards.md) §6 &mdash; &ldquo;Testing is part of development, not an afterthought&rdquo;
