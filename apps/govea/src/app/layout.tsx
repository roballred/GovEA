import type { Metadata } from 'next'
import './globals.css'

// Bootstrap content type registry on server startup
import '@/lib/registry'

export const metadata: Metadata = {
  title: {
    default: 'GovEA',
    template: '%s — GovEA',
  },
  description: 'Open source enterprise architecture for state and local government.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
