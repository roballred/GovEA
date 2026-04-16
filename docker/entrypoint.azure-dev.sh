#!/bin/sh
# Azure Container Apps entrypoint.
# Waits for the Postgres sidecar (localhost:5432) before migrating + seeding,
# then builds and starts the Next.js app (production build for stable server action IDs).
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
echo "==> Running database migrations..."
pnpm --filter govea db:migrate

echo ""
echo "==> Seeding database..."
# db:seed uses --env-file .env.local; in the container DATABASE_URL comes
# from the Azure env, so write a minimal .env.local before seeding.
printf 'DATABASE_URL=%s\n' "$DATABASE_URL" > /app/apps/govea/.env.local
pnpm --filter govea db:seed

echo ""
echo "==> Starting dev server..."
exec pnpm --filter govea dev
