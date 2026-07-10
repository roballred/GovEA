/**
 * Act-as sessions — owned by `@govcore/schema` and re-exported for `@/db/schema`
 * consumers. Phase 1b (#900). The `ACT_AS_*` constants are re-exported from core.
 */
export {
  actAsSessions,
  ACT_AS_DEFAULT_TTL_MINUTES,
  ACT_AS_END_REASONS,
  type ActAsSession,
  type NewActAsSession,
  type ActAsEndReason,
} from '@govcore/schema'
