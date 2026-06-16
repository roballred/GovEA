/**
 * Org-level module definitions.
 *
 * Default behaviour is controlled by `defaultOn`:
 *   defaultOn: true  (default) — absent key in `enabledModules` → module ON
 *   defaultOn: false           — absent key in `enabledModules` → module OFF
 *
 * Standard content modules use defaultOn: true so new modules are visible to
 * all orgs without backfilling rows. Optional overlays (e.g. TOGAF) use
 * defaultOn: false so they stay opt-in.
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
  | 'strategies'
  | 'objectives'
  | 'initiatives'
  | 'roadmap'
  | 'debt'
  | 'data-architecture'

export type ModuleGroup = 'Business Architecture' | 'Data Architecture' | 'Portfolio' | 'Strategy'

export type ModuleStateMap = Record<string, boolean>

export interface ModuleDef {
  key: ModuleKey
  label: string
  /**
   * The route prefix this module owns — used for nav filtering and route
   * guarding. Overlay modules that don't own a nav item set this to null.
   */
  href: string | null
  group: ModuleGroup
  /**
   * When false, the module is OFF unless `enabledModules[key]` is explicitly
   * `true`. When true (default), the module is ON unless explicitly `false`.
   */
  defaultOn?: boolean
}

export const MODULE_DEFS: ModuleDef[] = [
  // Business Architecture
  { key: 'personas',      label: 'Personas',           href: '/personas',      group: 'Business Architecture' },
  { key: 'value-streams', label: 'Value Streams',       href: '/value-streams', group: 'Business Architecture' },
  { key: 'capabilities',  label: 'Capabilities',        href: '/capabilities',  group: 'Business Architecture' },
  { key: 'services',      label: 'Services',            href: '/services',      group: 'Business Architecture' },
  { key: 'principles',    label: 'Principles',          href: '/principles',    group: 'Business Architecture' },
  { key: 'glossary',      label: 'Glossary',            href: '/glossary',      group: 'Business Architecture' },
  // Data Architecture
  { key: 'data-architecture', label: 'Data architecture', href: '/data',        group: 'Data Architecture' },
  // Portfolio
  { key: 'applications',  label: 'Applications',        href: '/applications',  group: 'Portfolio' },
  { key: 'adrs',          label: 'Decisions (ADRs)',    href: '/adrs',          group: 'Portfolio' },
  { key: 'debt',          label: 'Architecture debt',   href: '/debt',          group: 'Portfolio' },
  // Strategy
  { key: 'strategies',    label: 'Strategies',          href: '/strategies',    group: 'Strategy' },
  { key: 'objectives',    label: 'Objectives',          href: '/objectives',    group: 'Strategy' },
  { key: 'initiatives',   label: 'Initiatives',         href: '/initiatives',   group: 'Strategy' },
  { key: 'roadmap',       label: 'Roadmap',             href: '/roadmap',       group: 'Strategy' },
]

/**
 * Returns true when a module is enabled for the given org.
 * Respects the module's defaultOn setting — standard modules default to ON,
 * opt-in overlays default to OFF.
 */
export function isModuleEnabled(
  enabledModules: ModuleStateMap,
  key: ModuleKey,
): boolean {
  const def = MODULE_DEFS.find(m => m.key === key)
  const defaultOn = def?.defaultOn ?? true
  if (defaultOn) {
    return enabledModules[key] !== false
  }
  return enabledModules[key] === true
}

/**
 * Applies instance-wide module availability overrides to an org's module settings.
 * When an instance admin makes a module unavailable across the instance, it is
 * OFF for every org regardless of that org's local preference.
 */
export function mergeModuleSettings(
  orgEnabledModules: ModuleStateMap,
  instanceDisabledModules: ModuleStateMap,
): ModuleStateMap {
  const merged = { ...orgEnabledModules }
  for (const def of MODULE_DEFS) {
    if (instanceDisabledModules[def.key]) {
      merged[def.key] = false
    }
  }
  return merged
}

/**
 * Returns the ModuleDef whose href prefix matches the given pathname,
 * or undefined if the pathname doesn't belong to any module.
 */
export function moduleForPath(pathname: string): ModuleDef | undefined {
  return MODULE_DEFS.find(
    m => m.href !== null && (pathname === m.href || pathname.startsWith(m.href + '/')),
  )
}
