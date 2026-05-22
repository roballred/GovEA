/**
 * Client-side wrapper for the publish-readiness soft-warn gate (#567 Part B).
 *
 * Sibling to `submitWithDuplicateAck`. Each edit form calls
 * `submitWithPublishReadinessAck(editAction, formData)` — if the server
 * throws PublishReadinessAcknowledgmentRequiredError, this shows a
 * confirm dialog and re-submits with `acknowledgePublishIncomplete=on`.
 *
 * Detection is by error-message substring rather than `instanceof` so
 * this helper works on the client side without importing the server-only
 * @/lib/publish-readiness-gate module.
 */
'use client'

const READINESS_MESSAGE_MARKER = 'Publishing this'

export async function submitWithPublishReadinessAck(
  action: (fd: FormData) => Promise<unknown>,
  formData: FormData,
): Promise<void> {
  try {
    await action(formData)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes(READINESS_MESSAGE_MARKER) && msg.includes('makes the record harder to use')) {
      if (typeof window !== 'undefined' && window.confirm(msg + '\n\nPublish anyway? The missing fields will be logged in the audit trail.')) {
        formData.set('acknowledgePublishIncomplete', 'on')
        await action(formData)
        return
      }
    }
    throw err
  }
}
