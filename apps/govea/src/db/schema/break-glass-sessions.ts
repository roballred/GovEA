/**
 * Break-glass sessions — owned by `@govcore/schema` and re-exported for
 * `@/db/schema` consumers. Phase 1b (#900). Instance-operator construct that
 * deliberately crosses the tenant boundary, so it is not under org-GUC RLS;
 * authorization lives in the support layer.
 */
export { breakGlassSessions, type BreakGlassSession, type NewBreakGlassSession } from '@govcore/schema'
