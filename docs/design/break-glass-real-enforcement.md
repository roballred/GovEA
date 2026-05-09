# Break-Glass — Make It Real Before Hardening It

**Issue:** [#418](https://github.com/roballred/GovEA/issues/418)
**Status:** Design proposed, awaiting decision before code
**Capability:** `iam-instance-administration`
**Persona:** Instance Administrator

---

## Why this is a design note, not a PR

Issue #418 reads as a hardening task: shorten the break-glass TTL from 24 hours, add dual-control approval for longer windows, send a notification on grant, surface active sessions to other admins. All reasonable.

But before any of those land, there's a deeper question the issue's "Verify (parallel work)" caveat hints at: **the elevation row currently has no enforcement effect.** Nothing in the read paths consults `breakGlassSessions` to decide whether to allow cross-tenant access. An instance admin can read every tenant's organisation list, user list, and audit history right now without ever calling `grantBreakGlass`. Granting one doesn't unlock anything new; not having one doesn't lock anything down.

Confirmed by static survey of the codebase:

- `getActiveBreakGlass(adminId, orgId)` exists in `actions/instance.ts` but is never called by any read path
- `lib/instance-admin.ts::requireInstanceAdmin()` does not consult `breakGlassSessions`
- `lib/federation.ts` (entity ownership / federation visibility) does not consult `breakGlassSessions`
- `app/(instance)/instance/orgs/[id]/page.tsx` queries `breakGlassSessions` only to render an "active session" badge — the org's content beneath that badge is fetched unconditionally after `requireInstanceAdmin()`

This means tightening the TTL and adding dual-control would put a fence around an empty field. The fence might satisfy a checklist, but it doesn't change what an instance admin can actually do.

So this note proposes deciding **what break-glass should mean** before deciding how short its window should be.

---

## Three options

### Option 1 — Strict: metadata vs. content

Instance admins can see metadata about every org without break-glass. They cannot see org content without an active break-glass session for that specific org.

| Surface | Without break-glass | With break-glass for org X |
|---|---|---|
| List of orgs (names, slugs, suspended status, support tier) | ✅ | ✅ |
| Org count, user count, recent platform events | ✅ | ✅ |
| Cross-org user inventory (names, emails, role badges) | ✅ | ✅ |
| Org X's capability content, applications, ADRs, etc. | ❌ | ✅ (read-only) |
| Org X's draft / unpublished content | ❌ | ✅ (read-only) |
| Org X's audit log of mutations | ❌ | ✅ |
| Mutating org X's content (acting as their admin) | ❌ | Out of scope (separate impersonation feature) |

**This is the option that makes break-glass mean something.** It draws a real line between platform governance (always allowed) and tenant content access (gated, time-limited, audited).

UX cost: real but bounded. The Platform Admin → Organisations → org detail page works as today for the metadata sections. Below that, the content sections need a "Grant break-glass to view" prompt that an admin clicks through. Today that prompt would be a no-op and we'd remove the friction post-launch; under Option 1 it's the access control.

Implementation cost: medium. We need a helper like `requireBreakGlass(orgId)` that checks `breakGlassSessions` for an active, unrevoked, unexpired row matching `(adminId, orgId)`, then a small set of org-content read paths that call it. The set is genuinely small because today the Platform Admin shell deliberately does not deep-link into another org's content surfaces.

### Option 2 — Moderate: read-anywhere, mutate-via-impersonation

Instance admins can read everything (metadata + content) without break-glass. Break-glass unlocks acting as a member of org X — so they can edit / publish / delete in org X's content.

UX cost: minimal — matches today's read behaviour. New cost is around the impersonation flow (notice banners, audit, exit).

Honest assessment: this is closer to "Trust the instance admin" with extra friction on writes. It doesn't materially limit what a compromised credential can read. For state and local government data, that's a meaningful gap — most exfiltration scenarios are read-only.

Also: GovEA today has no impersonation flow. Building one is a separate non-trivial feature. Option 2 implies adding it.

### Option 3 — Minimal: break-glass as acknowledged-flag

Instance admins see everything they see today. `grantBreakGlass` becomes a no-op flag with audit. The audit row says "I am acknowledging I'm crossing a tenant boundary."

This is honest about the role and adds nothing real. The TTL / dual-control / notification work in #418 would still live on top, but they'd be ceremony around an unenforced concept. I'd argue against shipping this as the answer to #418 because it papers over the actual finding.

---

## Recommendation: Option 1

Three reasons:

1. **It's the only option that turns `breakGlassSessions` into a real access control.** Once Option 1 ships, the existing tests for grant / revoke / expiry mean something — they validate enforcement, not just record-keeping.

2. **The line "metadata always / content gated" is intuitive for operators.** It maps to how MSPs and shared-service teams already think about hosted environments: you can see who is on the platform without reading what they're working on. State and local government IT teams will recognise this.

3. **The implementation surface is small and known.** Currently, the Platform Admin shell does not deep-link into org content surfaces — Organisations → org detail shows users, suspension, governance, audit, and break-glass session status, but not capabilities / applications / ADRs etc. So the "gate" is at the boundary where future deep-links would be added, not retrofitted into 30 existing pages. This is the cheapest moment to add the gate; it gets harder as the Platform Admin surface grows.

---

## What ships under Option 1

A first slice that adds the enforcement layer plus the #418 hardening on top:

| Deliverable | Why now |
|---|---|
| `requireBreakGlass(orgId)` helper that throws Forbidden when no active session | The actual access control |
| Default TTL **1 hour** (was 24h) | #418 ask |
| Cap at **8 hours** with required reason | #418 ask |
| **Dual control:** TTL > 1h requires a second instance-admin's approval before reads are honored | #418 ask |
| Active break-glass sessions visible to all instance admins on the platform dashboard | #418 ask — operator visibility |
| Notification webhook hook on grant (configuration deferred to #391 platform endpoint config) | #418 ask — high-visibility on grant |
| Tests proving the elevated-read paths actually consult the row | This is the concrete proof Option 1 isn't decorative |

---

## What stays out of this slice

- **Impersonation / mutation under break-glass.** Option 1 grants read-only access. Letting an instance admin edit / publish / delete in org X is a larger feature (audit semantics, attribution, exit flow) and is its own issue.
- **Reading break-glass-gated content from non-Platform-Admin surfaces.** The slice gates the Platform Admin shell only. The org-level shell (`/dashboard`, `/personas`, etc.) remains scoped to the user's own organization.
- **Per-resource break-glass.** TTL and approval are per-org, not per-record.
- **Configurable TTL caps.** The 1h default and 8h ceiling are hardcoded constants in the first slice. A platform-config setting can come later if the operator population diverges.

---

## Open questions

Before I write any code, three answers I want from you:

1. **Option 1 is what we want?** Or is the real intent something closer to Option 2 (read everywhere, mutate with break-glass)? Or Option 3 (acknowledged-flag, no enforcement)?

2. **Dual control: blocking or advisory?** "TTL > 1h requires second admin approval" can mean two things: the elevated state is not honored at all until approved (blocking — proposed), OR a notification is sent and admins can see/revoke before the window expires (advisory). Blocking is stronger; advisory is faster to operate. My recommendation: blocking.

3. **What's the right second-admin pool for dual control?** Any other instance admin in the same instance, regardless of org? Or a designated "approver" subset? My recommendation: any other instance admin — keeps it simple and matches the role definition.

---

## Why this design note exists

The acceptance criteria on #418 say "default TTL is 1 hour" and "TTL > 1h requires a second-admin approval." Both are reasonable as written. But applying them to the current code wires guardrails around an unenforced concept. The fix that satisfies the spirit of the issue is to make break-glass enforce something first, then put the guardrails on it.

If we agree on Option 1, the implementation PR is straightforward and follows the same pattern as #416 (transactional audit) and #417 (immutable audit log) — concrete, testable, and tied to the IAM capability docs.

If we don't agree on Option 1, that's also useful — the alternative shapes the implementation differently and avoids work on enforcement code that nobody wants.
