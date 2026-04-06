export type ThemeId = 'govea' | 'servicenow'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  previewColors: {
    header: string   // hex for preview swatch
    primary: string
    background: string
  }
  vars: Record<string, string>
}

export const themes: ThemeDefinition[] = [
  {
    id: 'govea',
    name: 'GovEA',
    description: 'Clean, professional blue. WCAG AA compliant.',
    previewColors: {
      header: '#152c5c',
      primary: '#1a4fba',
      background: '#f8f9fb',
    },
    vars: {
      '--background': '0 0% 100%',
      '--foreground': '222 47% 11%',
      '--card': '0 0% 100%',
      '--card-foreground': '222 47% 11%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222 47% 11%',
      '--primary': '221 83% 40%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '214 32% 95%',
      '--secondary-foreground': '222 47% 11%',
      '--muted': '214 32% 95%',
      '--muted-foreground': '215 16% 47%',
      '--accent': '214 32% 95%',
      '--accent-foreground': '222 47% 11%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214 32% 91%',
      '--input': '214 32% 91%',
      '--ring': '221 83% 40%',
      '--radius': '0.375rem',
      '--header-bg': '221 56% 22%',
      '--header-fg': '214 40% 93%',
      '--header-border': '221 56% 30%',
    },
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    description: 'Dark header with purple accents. Familiar to ServiceNow users.',
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
      '--destructive': '0 84% 60%',
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

export function themeToStyleString(theme: ThemeDefinition): string {
  const vars = Object.entries(theme.vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
  return `:root { ${vars} }`
}
