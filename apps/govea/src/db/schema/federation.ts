/**
 * Federation tables (`org_connections`, `cross_org_links`) — owned by
 * `@govcore/schema` and re-exported for `@/db/schema` consumers. Phase 1b (#900).
 *
 * The local `connection_status` / `link_status` / `link_type` pgEnums are retired:
 * core uses the shared `federation_status` enum for the status columns and free
 * `text` for `link_type` (link semantics are app-defined and validated in app
 * code). No app code imported those enums as values.
 */
export {
  orgConnections,
  crossOrgLinks,
  type OrgConnection,
  type NewOrgConnection,
  type CrossOrgLink,
  type NewCrossOrgLink,
} from '@govcore/schema'
