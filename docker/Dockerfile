FROM node:20-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/govea/package.json ./apps/govea/
COPY packages/core/package.json ./packages/core/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/govea/node_modules ./apps/govea/node_modules
COPY . .
# Build @govea/core first (Next.js depends on it), then build govea directly
# bypassing turbo to avoid workspace PATH resolution issues in Docker
RUN cd packages/core && node ../../node_modules/typescript/bin/tsc
RUN cd apps/govea && node node_modules/next/dist/bin/next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/govea/.next/standalone ./
COPY --from=builder /app/apps/govea/.next/static ./apps/govea/.next/static
COPY --from=builder /app/apps/govea/public ./apps/govea/public
EXPOSE 3000
CMD ["node", "apps/govea/server.js"]
