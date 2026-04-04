import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GovEA',
  description: 'Enterprise architecture for state and local government',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
