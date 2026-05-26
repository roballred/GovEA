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
  // #34: the @govea/core workspace package is the canonical source for RBAC
  // (and, in time, audit / content-types / taxonomy / workflow / recipes).
  // It ships TypeScript source, no built dist/. transpilePackages tells the
  // Next.js build to compile workspace packages on the fly so consumers do
  // not need a separate `pnpm --filter @govea/core build` step.
  transpilePackages: ['@govea/core'],
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
}

export default nextConfig
