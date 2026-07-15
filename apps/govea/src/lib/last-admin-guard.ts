/**
 * The last-active-admin invariant, adapted to GovEA's wording (#893).
 *
 * The invariant itself now lives in `@govcore/tenancy`
 * (`assertNotLastActiveAdmin`, GovCore #65) — this module is the app-side seam
 * on top of it, and deliberately re-implements none of the decision.
 *
 * Two things need adapting:
 *
 * 1. **Role vocabulary.** Core is generic over role names (roles are app-defined
 *    `text`), so every call has to name GovEA's admin role. Pinning it here means
 *    the string 'admin' appears once instead of at four call sites.
 *
 * 2. **The message.** Core throws a typed `LastActiveAdminError` whose message —
 *    "Refusing to remove the last active admin of organization <uuid>" — is built
 *    for logs, not for people: our membership tables render `e.message` straight
 *    into the UI, so it would show an operator an org UUID. The call sites already
 *    have precise, human wording ("Cannot demote the last admin of this
 *    organization."), and the integration tests assert on it, so we translate the
 *    typed error back into that message rather than change either.
 *
 * Pass a transaction handle as `db` — a `tx` satisfies core's `GovcoreDb`, which
 * puts the admin count and the write it guards in one snapshot (the local code
 * this replaced counted *before* opening the transaction, leaving a small TOCTOU
 * window).
 */
import type { GovcoreDb } from '@govcore/schema'
import { assertNotLastActiveAdmin, LastActiveAdminError, type MembershipChange } from '@govcore/tenancy'

/** GovEA's admin role name, as core's generic `adminRole` parameter wants it. */
const ADMIN_ROLE = 'admin'

/**
 * Throw `new Error(message)` if `change` would leave `organizationId` with no
 * active admin. A no-op for any change that cannot orphan the org (core skips
 * the count query entirely for those — promotions, no-op saves, non-admins).
 *
 * `message` is the caller's existing user-facing wording; only the last-admin
 * case is rewritten, so a genuine DB failure still propagates untouched.
 */
export async function assertNotLastAdmin(
  db: GovcoreDb,
  opts: { organizationId: string; change: MembershipChange; message: string },
): Promise<void> {
  try {
    await assertNotLastActiveAdmin(db, {
      organizationId: opts.organizationId,
      adminRole: ADMIN_ROLE,
      change: opts.change,
    })
  } catch (err) {
    if (err instanceof LastActiveAdminError) throw new Error(opts.message)
    throw err
  }
}
