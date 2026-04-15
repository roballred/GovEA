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
pnpm --filter govea db:seed

echo ""
echo "==> Starting server..."
exec pnpm --filter govea start
