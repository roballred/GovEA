/**
 * Trace-participant registry (#695).
 *
 * Entities that appear inside traceability chains without being trace roots.
 * Their detail pages link to /traceability?from=<kind>&id=<id>, which renders
 * a participation panel (see getTraceParticipation in actions/traceability.ts)
 * instead of a root trace. Lives outside the 'use server' action file because
 * server-action modules may only export async functions.
 */

export type TraceParticipantKind =
  | 'application' | 'initiative' | 'persona' | 'adr' | 'principle'

export const TRACE_PARTICIPANT_KINDS: readonly TraceParticipantKind[] =
  ['application', 'initiative', 'persona', 'adr', 'principle'] as const

export function isTraceParticipantKind(value: string): value is TraceParticipantKind {
  return (TRACE_PARTICIPANT_KINDS as readonly string[]).includes(value)
}

/** Detail-page route + back-label per participant kind. */
export const PARTICIPANT_ROUTES: Record<TraceParticipantKind, { hrefBase: string; label: string }> = {
  application: { hrefBase: '/applications', label: 'Application' },
  initiative: { hrefBase: '/initiatives', label: 'Initiative' },
  persona: { hrefBase: '/personas', label: 'Persona' },
  adr: { hrefBase: '/adrs', label: 'Decision' },
  principle: { hrefBase: '/principles', label: 'Principle' },
}
