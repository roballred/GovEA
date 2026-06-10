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

// #739 — baseline security response headers.
//
// The enforced headers below are safe for an app of this shape. The CSP is
// intentionally shipped in *report-only* mode first: the app injects an inline
// `<style>` for org theming (app-shell.tsx) and mermaid renders inline SVG, so
// an enforcing `style-src`/`script-src` needs a nonce or hash rollout. Starting
// report-only surfaces violations (via the browser console / a report endpoint)
// without breaking the UI; a follow-up tightens to an enforcing policy.
//
// `frame-ancestors 'none'` (clickjacking) is also expressed via the enforced
// `X-Frame-Options: DENY` header, which older browsers honour.
const cspReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline' is what we want to *remove* via nonces in the enforcing
  // follow-up; documented here so the report-only baseline matches today's app.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
]

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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
