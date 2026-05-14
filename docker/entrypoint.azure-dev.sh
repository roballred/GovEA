#!/bin/sh
# Azure Container Apps entrypoint.
# Waits for the Postgres sidecar (localhost:5432) before schema sync + seeding,
# then starts the pre-built Next.js app (production mode for stable server action IDs).
set -e

echo ""
echo "==> Waiting for Postgres..."
until node -e "
  const n = require('net');
  const s = n.createConnection(5432, 'localhost');
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error',   () => process.exit(1));
" 2>/dev/null; do
  sleep 2
done
echo "    Postgres is ready."

echo ""
echo "==> Syncing database schema..."
# Pre-production: push schema directly (no migration files yet).
# Switch to db:migrate once the first persistent tenant/data exists.
pnpm --filter govea exec drizzle-kit push --force

echo ""
echo "==> Seeding database..."
# db:seed:container reads DATABASE_URL directly from the environment
# (no --env-file needed — Azure injects DATABASE_URL as an env var).
pnpm --filter govea db:seed:container

echo ""
echo "==> Starting server..."
cd /app/apps/govea
exec node .next/standalone/apps/govea/server.js
