/**
 * Publish-readiness soft-warn gate (#567 Part B).
 *
 * Surfaced by the Junior EA Analyst persona walk pain point #4:
 *   "Senior architects review work infrequently; there is no way to
 *    self-validate quality before a mistake propagates."
 *
 * Today the only blocking validation on a publish is HTML5 `required`
 * on `name`. A "published" capability with no domain, no persona link,
 * no behaviors is structurally valid from the form's perspective — and
 * once it lands, downstream consumers see an incomplete record.
 *
 * Same ack pattern as the other publish gates (debt-publish, domain-owner
 * overwrite, duplicate-name): warn at the transition-to-published moment
 * with a typed error the client form catches + offers a re-submit with
 * `acknowledgePublishIncomplete=on`. The publish is not blocked — the
 * issue's "self-validate quality" framing is about visibility, not
 * enforcement.
 *
 * Per-entity "what does meaningful-complete look like?" is a judgment
 * call. The thresholds below are deliberately minimal — only fields
 * that would make the record useless if absent. Future iterations can
 * tighten them as the persona evidence accumulates.
 */

export type PublishReadinessEntityType =
  | 'capability'
  | 'application'
  | 'persona'
  | 'objective'

/**
 * Thrown when a publish (or accept, for ADRs) is attempted on a record
 * missing meaningful fields. Carries the list of missing-field labels so
 * the client can show "missing: domain, persona link" without re-checking
 * server-side.
 */
export class PublishReadinessAcknowledgmentRequiredError extends Error {
  readonly code = 'PUBLISH_READINESS_ACK_REQUIRED'
  readonly entityType: PublishReadinessEntityType
  readonly missingFields: string[]

  constructor(entityType: PublishReadinessEntityType, missingFields: string[]) {
    super(
      `Publishing this ${entityType} without [${missingFields.join(', ')}] makes the record harder to use. Submit again to publish anyway.`,
    )
    this.entityType = entityType
    this.missingFields = missingFields
  }
}

/**
 * The full set of "what makes a publish-ready X" rules. Each rule reads
 * either a scalar field from the FormData or a count of link entries.
 *
 * Rule shape:
 *   - label: human-readable field name shown in the error message
 *   - check: returns true when the rule is satisfied for the given inputs
 */
type Rule = {
  label: string
  check: (form: FormData, linkCounts: LinkCounts) => boolean
}

type LinkCounts = {
  /** Number of personas linked. Used by capability, service. */
  personaCount?: number
  /** Number of capabilities linked. Used by application, objective, initiative. */
  capabilityCount?: number
  /** Number of applications linked. Used by capability. */
  applicationCount?: number
  /** Number of objectives linked. Used by capability. */
  objectiveCount?: number
}

function nonEmpty(form: FormData, key: string): boolean {
  const v = form.get(key)
  return typeof v === 'string' && v.trim().length > 0
}

const RULES: Record<PublishReadinessEntityType, Rule[]> = {
  capability: [
    // A published capability that's not tied to anything (no domain, no
    // persona, no application, no objective) is structurally unreviewable.
    // The minimum bar: it must say WHAT it is (domain) AND WHO it serves
    // (a persona link) OR what it powers (an application/objective link).
    { label: 'domain', check: form => nonEmpty(form, 'domain') },
    {
      label: 'persona, application, or objective link',
      check: (_, c) =>
        (c.personaCount ?? 0) > 0 ||
        (c.applicationCount ?? 0) > 0 ||
        (c.objectiveCount ?? 0) > 0,
    },
  ],
  application: [
    // A published application with no capability link means we know it
    // exists but not what business need it supports — fast path to a
    // "what is this for?" question from an exec viewer.
    { label: 'capability link', check: (_, c) => (c.capabilityCount ?? 0) > 0 },
  ],
  persona: [
    // The persona file becomes worthless without at least a description
    // or a type — both empty means "we know this role exists" and nothing
    // else.
    {
      label: 'description or type',
      check: form => nonEmpty(form, 'description') || nonEmpty(form, 'type'),
    },
  ],
  objective: [
    // An objective without a success metric is a slogan, not an
    // objective. The persona walks called this out specifically.
    { label: 'success metric', check: form => nonEmpty(form, 'successMetric') },
  ],
}

/**
 * Returns the list of unmet rule labels. Empty array = ready to publish.
 */
export function checkPublishReadiness(
  entityType: PublishReadinessEntityType,
  formData: FormData,
  linkCounts: LinkCounts = {},
): string[] {
  return RULES[entityType]
    .filter(r => !r.check(formData, linkCounts))
    .map(r => r.label)
}

/**
 * Gate function called from an edit/create action when the status
 * transitions to a "publish-equivalent" state (published / accepted).
 *
 *   - `transitioningToPublished`: true when the edit moves the record
 *     from non-published into published. Re-saves of an already-published
 *     record don't fire the gate (matches the debt-publish gate's
 *     once-per-transition semantics).
 *   - `acknowledged`: true when the form sent
 *     `acknowledgePublishIncomplete=on`.
 *
 * Throws `PublishReadinessAcknowledgmentRequiredError` when the gate
 * fires and the ack is missing. When the ack IS present, returns the
 * list of missing fields so the caller can write an audit row.
 */
export function ensurePublishReady({
  entityType, formData, linkCounts, transitioningToPublished, acknowledged,
}: {
  entityType: PublishReadinessEntityType
  formData: FormData
  linkCounts?: LinkCounts
  transitioningToPublished: boolean
  acknowledged: boolean
}): { missingFields: string[] } {
  if (!transitioningToPublished) return { missingFields: [] }
  const missing = checkPublishReadiness(entityType, formData, linkCounts)
  if (missing.length === 0) return { missingFields: [] }
  if (!acknowledged) {
    throw new PublishReadinessAcknowledgmentRequiredError(entityType, missing)
  }
  return { missingFields: missing }
}
