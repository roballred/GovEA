import type { Metadata } from 'next'
import './globals.css'
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
        {/* Apply dark class before first paint to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('govea-dark-mode');if(s==='dark'||(s===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
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
