import type { Metadata } from 'next'
import './globals.css'
import { ThemeInitScript } from '@govcore/nextkit'
import { ActAsBanner } from '@/components/act-as-banner'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'GovEA',
  description: 'Enterprise architecture for state and local government',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Restore brand + dark mode before first paint to avoid a theme flash
            (#897). Reads the shared @govcore/theme localStorage keys written by
            the nextkit ThemeSelector / DarkModeToggle. */}
        <ThemeInitScript />
      </head>
      <body>
        <Providers>
          <ActAsBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
