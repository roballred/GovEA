import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@govea/core'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

export default nextConfig
