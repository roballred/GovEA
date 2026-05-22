/**
 * Client-side wrapper for the duplicate-name soft-warn gate (#566).
 *
 * Each create form calls `submitWithDuplicateAck(createAction, formData)`.
 * If the server throws DuplicateNameAcknowledgmentRequiredError, the
 * wrapper shows a window.confirm dialog and re-submits with
 * `acknowledgeDuplicate=on`. If the user dismisses the confirm, the
 * original error is re-thrown so the calling form can decide what to do.
 *
 * Detection is by error-message substring rather than `instanceof` so
 * this helper works on the client side without importing the server-only
 * @/lib/duplicate-name-gate module (which pulls in db client + drizzle).
 */
'use client'

/** Substring carried by every DuplicateNameAcknowledgmentRequiredError message. */
const DUPLICATE_MESSAGE_MARKER = 'already exists in this organization'

export async function submitWithDuplicateAck(
  action: (fd: FormData) => Promise<unknown>,
  formData: FormData,
): Promise<void> {
  try {
    await action(formData)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes(DUPLICATE_MESSAGE_MARKER)) {
      if (typeof window !== 'undefined' && window.confirm(msg + '\n\nCreate anyway?')) {
        formData.set('acknowledgeDuplicate', 'on')
        await action(formData)
        return
      }
    }
    throw err
  }
}
