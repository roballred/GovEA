/**
 * Org-level module definitions.
 *
 * Absent key in `enabledModules` → module is ON.
 * Only explicitly set `false` values disable a module, so new modules
 * are visible to all orgs automatically without backfilling rows.
 */

export type ModuleKey =
  | 'personas'
  | 'value-streams'
  | 'capabilities'
  | 'services'
  | 'glossary'
  | 'applications'
  | 'adrs'
  | 'principles'
  | 'objectives'
  | 'initiatives'
  | 'roadmap'

export type ModuleGroup = 'Business Architecture' | 'Portfolio' | 'Strategy'

export interface ModuleDef {
  key: ModuleKey
  label: string
  /** The route prefix this module owns — used for nav filtering and route guarding. */
  href: string
  group: ModuleGroup
}

export const MODULE_DEFS: ModuleDef[] = [
  // Business Architecture
  { key: 'personas',      label: 'Personas',           href: '/personas',      group: 'Business Architecture' },
  { key: 'value-streams', label: 'Value Streams',       href: '/value-streams', group: 'Business Architecture' },
  { key: 'capabilities',  label: 'Capabilities',        href: '/capabilities',  group: 'Business Architecture' },
  { key: 'services',      label: 'Services',            href: '/services',      group: 'Business Architecture' },
  { key: 'glossary',      label: 'Glossary',            href: '/glossary',      group: 'Business Architecture' },
  // Portfolio
  { key: 'applications',  label: 'Applications',        href: '/applications',  group: 'Portfolio' },
  { key: 'adrs',          label: 'Decisions (ADRs)',    href: '/adrs',          group: 'Portfolio' },
  { key: 'principles',    label: 'Principles',          href: '/principles',    group: 'Portfolio' },
  // Strategy
  { key: 'objectives',    label: 'Objectives',          href: '/objectives',    group: 'Strategy' },
  { key: 'initiatives',   label: 'Initiatives',         href: '/initiatives',   group: 'Strategy' },
  { key: 'roadmap',       label: 'Roadmap',             href: '/roadmap',       group: 'Strategy' },
]

/** Returns true when a module is enabled. Absent key defaults to true. */
export function isModuleEnabled(
  enabledModules: Record<string, boolean>,
  key: ModuleKey,
): boolean {
  return enabledModules[key] !== false
}

/**
 * Returns the ModuleDef whose href prefix matches the given pathname,
 * or undefined if the pathname doesn't belong to any module.
 */
export function moduleForPath(pathname: string): ModuleDef | undefined {
  return MODULE_DEFS.find(
    m => pathname === m.href || pathname.startsWith(m.href + '/'),
  )
}
