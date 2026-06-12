export type ThemeId = 'govea' | 'servicenow'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  darkMode: boolean
  previewColors: {
    header: string   // hex for preview swatch
    primary: string
    background: string
  }
  /**
   * CSS custom properties this theme intentionally overrides relative to
   * globals.css. Anything omitted cascades from the base tokens in
   * globals.css — :root (light) / .dark (dark). Do not mirror globals.css
   * values here: the inline theme <style> wins the cascade at runtime, so a
   * stale copy silently negates later fixes to the base tokens (#766/#770;
   * drift guard in tests/unit/theme-globals-sync.test.ts).
   */
  vars: Record<string, string>
}

export const themes: ThemeDefinition[] = [
  {
    id: 'govea',
    name: 'GovEA',
    description: 'Clean, professional blue. WCAG AA compliant.',
    darkMode: false,
    previewColors: {
      header: '#152c5c',
      primary: '#1a4fba',
      background: '#f8f9fb',
    },
    // GovEA is the default brand — its content tokens ARE the globals.css
    // base values, so only the header/brand vars are declared here (#772).
    vars: {
      '--header-bg': '221 56% 22%',
      '--header-fg': '214 40% 93%',
      '--header-border': '221 56% 30%',
    },
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    description: 'Dark header with purple accents. Familiar to ServiceNow users.',
    darkMode: true,
    previewColors: {
      header: '#1c2433',
      primary: '#6b3fa0',
      background: '#f7f7f7',
    },
    vars: {
      '--background': '210 17% 97%',
      '--foreground': '220 20% 18%',
      '--card': '0 0% 100%',
      '--card-foreground': '220 20% 18%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '220 20% 18%',
      '--primary': '270 44% 44%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '220 14% 93%',
      '--secondary-foreground': '220 20% 18%',
      '--muted': '220 14% 93%',
      '--muted-foreground': '220 9% 46%',
      '--accent': '270 44% 94%',
      '--accent-foreground': '270 44% 30%',
      // Intentional override (unlike --destructive, which cascades from
      // globals.css): 0 0% 98% matches this theme's neutral palette and
      // passes AA on the base --destructive background.
      '--destructive-foreground': '0 0% 98%',
      '--border': '220 13% 87%',
      '--input': '220 13% 87%',
      '--ring': '270 44% 44%',
      '--radius': '0.25rem',
      '--header-bg': '222 33% 17%',
      '--header-fg': '210 20% 90%',
      '--header-border': '222 33% 23%',
    },
  },
]

export function getTheme(id: string): ThemeDefinition {
  return themes.find(t => t.id === id) ?? themes[0]
}

// Header/brand vars apply in both light and dark mode (org branding is always visible).
// Content-area vars (--background, --card, --primary, etc.) are scoped to
// :root:not(.dark) so they apply in light mode only — the .dark {} block in
// globals.css takes over when dark mode is active without being overridden by
// this inline style tag.
const BRAND_VARS = ['--header-bg', '--header-fg', '--header-border']

// #769 — defense in depth for the inline <style> injection in app-shell.
// Theme vars are serialized into a style tag without HTML escaping, so every
// declaration must match a conservative allowlist before it is emitted.
// Today vars only come from the hard-coded list above (org admins pick a
// theme *id*; updateOrgTheme rejects unknown ids), but custom org branding is
// future fd-theming work — this keeps a '</style><script>' breakout
// structurally impossible no matter where a value originates. None of the
// accepted shapes can contain '<', ';', '{', '}', quotes, or backslashes.
const SAFE_VAR_NAME = /^--[a-z][a-z0-9-]*$/

const SAFE_VAR_VALUE_PATTERNS = [
  // Space-separated HSL triple, the shadcn token format: "221 83% 40%"
  /^\d{1,3}(\.\d+)? \d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/,
  // Plain CSS length/percentage: "0.375rem", "2px", "50%"
  /^-?\d+(\.\d+)?(rem|em|px|%)$/,
  // Hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa
  /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  // Functional colors with a strict argument charset: rgb(...), hsl(...)
  /^(rgb|rgba|hsl|hsla)\([\d.,%\s/]*\)$/,
  // Named colors / keywords: "white", "transparent"
  /^[a-zA-Z]{3,30}$/,
]

/** True when a CSS custom property is safe to emit into the inline style tag. */
export function isSafeThemeVar(name: string, value: string): boolean {
  return (
    SAFE_VAR_NAME.test(name) &&
    value.length <= 100 &&
    SAFE_VAR_VALUE_PATTERNS.some(re => re.test(value))
  )
}

export function themeToStyleString(theme: ThemeDefinition): string {
  const entries = Object.entries(theme.vars).filter(([k, v]) => {
    if (isSafeThemeVar(k, v)) return true
    // Shipped themes always pass (pinned by tests/unit/theme-value-safety.test.ts),
    // so a strip here means a value arrived from an untrusted source.
    console.warn(`themeToStyleString: dropped unsafe theme var ${JSON.stringify(k)}`)
    return false
  })

  const brandVars = entries
    .filter(([k]) => BRAND_VARS.includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')

  const contentVars = entries
    .filter(([k]) => !BRAND_VARS.includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')

  // Brand vars always apply; content vars only apply when not in dark mode
  return `:root { ${brandVars} } :root:not(.dark) { ${contentVars} }`
}
