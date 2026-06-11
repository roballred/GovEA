/**
 * SSO provisioning guard (#213)
 *
 * GovEA uses invite-based SSO binding: an admin must pre-create a user account
 * (with an explicit org and role assignment) before the corresponding SSO
 * identity can sign in. This module implements and tests that check independently
 * of NextAuth's callback machinery.
 *
 * Why invite-based, not domain-allowlist or org-picker?
 * - Government orgs often share a single Entra tenant across departments
 *   (same tenant ID, multiple GovEA organizations), so a tenant→org mapping
 *   is not 1:1 and cannot be used for automatic routing.
 * - Invite-based binding is the most conservative model and matches the
 *   expectation admins already have from creating users in /users.
 *
 * Identity model: users.email is globally unique across all organizations (#269).
 * A lookup by bare email is therefore unambiguous and always resolves to exactly
 * one user record (or none).
 */

import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resolveActiveMembership } from '@/lib/active-membership'

export type SsoCheckResult =
  | { status: 'allowed'; userId: string; organizationId: string; role: string }
  | { status: 'not_provisioned' }
  | { status: 'no_org_binding'; userId: string }
  | { status: 'deactivated'; userId: string }

/**
 * Checks whether an SSO identity (identified by email) is permitted to sign in.
 *
 * Returns `allowed` only if a pre-provisioned, active user with an org binding
 * exists for the given email. All other outcomes block the sign-in.
 *
 * #693 — org binding resolves through memberships first (the same resolution
 * the jwt callback applies after ANY sign-in, so SSO and local credentials see
 * the same membership set), falling back to the denormalized
 * `users.organization_id` home pointer for accounts predating memberships.
 * Without this, an identity provisioned into orgs purely via memberships
 * (e.g. by the instance console, #756) would be blocked at SSO sign-in while
 * the same person could sign in locally.
 */
export async function checkSsoProvisioning(email: string): Promise<SsoCheckResult> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (!dbUser) return { status: 'not_provisioned' }
  if (dbUser.isActive !== 'true') return { status: 'deactivated', userId: dbUser.id }

  const membership = await resolveActiveMembership(dbUser.id, dbUser.lastActiveOrganizationId)
  if (membership) {
    return {
      status: 'allowed',
      userId: dbUser.id,
      organizationId: membership.organizationId,
      role: membership.role,
    }
  }

  if (!dbUser.organizationId) return { status: 'no_org_binding', userId: dbUser.id }

  return {
    status: 'allowed',
    userId: dbUser.id,
    organizationId: dbUser.organizationId,
    role: dbUser.role,
  }
}
