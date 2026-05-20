/**
 * SMTP delivery transport (#528).
 *
 * v1 status: the transport implementation is deliberately a stub. The
 * full nodemailer integration is queued for a follow-up PR because
 * adding `nodemailer` as a runtime dependency requires `pnpm install`
 * in the main repo's node_modules, which is shared with concurrent
 * worktrees and would force a re-link across all of them.
 *
 * Shipping the surface (settings + delivery log + dashboard banner)
 * unblocks every downstream feature that depends on Email being
 * "configurable" — #581 (change notifications), password reset flows,
 * incident alerts. The send itself is wired the same way nodemailer
 * would expose it (`sendMail({ to, subject, body, settings })` returns
 * a result/error), so the follow-up PR only swaps the body of this
 * function.
 *
 * Until then, every send returns a structured "not yet implemented"
 * failure that the delivery log captures, so admins can verify their
 * SMTP settings save correctly but know they need the follow-up PR
 * for actual delivery.
 */

import type { EmailSettings } from '@/db/schema'
import { decryptCredential } from './credential-cipher'

export type EmailMessage = {
  to: string
  subject: string
  body: string
}

export type SendResult =
  | { ok: true; durationMs: number }
  | { ok: false; durationMs: number; error: string }

const STUB_ERROR_MESSAGE =
  'SMTP transport not yet implemented in this build. Settings save and log shape are in place; ' +
  'the nodemailer integration ships in the follow-up PR. Track on the issue closing #528.'

export async function sendMail(message: EmailMessage, settings: EmailSettings): Promise<SendResult> {
  const start = Date.now()

  // Validate the sealed credentials roundtrip before reporting "not
  // implemented" — this catches mis-saved credentials (corrupt blob,
  // wrong key) at send-time rather than at follow-up-PR time.
  if (settings.passwordEncrypted) {
    try {
      decryptCredential(settings.passwordEncrypted)
    } catch (e) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        error: `Stored SMTP credentials are unreadable (${e instanceof Error ? e.message : String(e)}). ` +
               'This usually means EMAIL_CRED_KEY or AUTH_SECRET changed since the credentials were saved. ' +
               'Re-save the credentials to re-encrypt with the current key.',
      }
    }
  }

  // Validate basic message shape — useful to fail fast in tests.
  if (!message.to.includes('@')) {
    return { ok: false, durationMs: Date.now() - start, error: 'Invalid to-address' }
  }
  if (!settings.fromAddress.includes('@')) {
    return { ok: false, durationMs: Date.now() - start, error: 'Invalid From address in settings' }
  }
  if (!settings.host || settings.port <= 0 || settings.port > 65535) {
    return { ok: false, durationMs: Date.now() - start, error: 'Invalid SMTP host or port in settings' }
  }
  void message  // suppress unused-var lint until the real transport reads body/subject

  return { ok: false, durationMs: Date.now() - start, error: STUB_ERROR_MESSAGE }
}
