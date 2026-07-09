// GovEA's theme registry (#897).
//
// Theme *definitions* and the injection-safety allowlist now live in
// @govcore/theme (defineTheme sanitizes brand vars; base.css holds the WCAG-AA
// floor). This file only declares which shared themes GovEA offers and resolves
// one by id — app-level composition on top of the shared platform themes.
import { starterThemes, type ThemeDefinition } from '@govcore/theme'

export type { ThemeDefinition }

/** Themes GovEA offers in the selector. starterThemes[0] (govcore) is the default. */
export const themes = starterThemes

/** Resolve a persisted theme id, falling back to the canonical default. */
export function getTheme(id: string): ThemeDefinition {
  return themes.find(t => t.id === id) ?? themes[0]
}
