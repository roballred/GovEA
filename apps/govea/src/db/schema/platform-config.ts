/**
 * Platform config (singleton; not org-scoped) — owned by `@govcore/schema` and
 * re-exported for `@/db/schema` consumers. Phase 1b (#900).
 *
 * Note: core's column defaults are GovCore-flavored (`instance_name` → 'GovCore',
 * `default_theme` → 'base'). GovEA's seed sets these explicitly ('GovEA' /
 * 'govcore'), so the defaults are not relied on — see the seed.
 */
export { platformConfig, type PlatformConfig, type NewPlatformConfig } from '@govcore/schema'
