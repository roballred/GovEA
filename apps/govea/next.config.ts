import type { NextConfig } from 'next'

const allowedOrigins = ['localhost:3000']

// When deployed to Azure (or any remote host), NEXT_PUBLIC_APP_URL carries the
// full origin. Extract just the host so server actions are not blocked by the
// CSRF origin check.
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).host)
  } catch {
    // malformed URL — skip
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
}

export default nextConfig
