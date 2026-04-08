#!/bin/sh
set -e

echo ""
echo "==> Running database migrations..."
pnpm --filter govea db:migrate

echo ""
echo "==> Seeding database..."
pnpm --filter govea db:seed

echo ""
echo "==> Starting dev server..."
exec pnpm --filter govea dev
