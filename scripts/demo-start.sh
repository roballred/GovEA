#!/bin/bash
set -e

# demo-start.sh — Local demo workflow
#
# Runs the database in a container and the Next.js app directly on the host.
# Use this when you want fast hot reload without fully containerising the app.
#
# Runtime auto-detection: uses Podman when installed, falls back to Docker.
# Override with: CONTAINER_RUNTIME=docker bash scripts/demo-start.sh
#
# Prerequisites:
#   - Podman or Docker running
#   - Node >= 20 and pnpm >= 9 installed
#   - .env.local present in apps/govea/ (copy from .env.example if needed)
#
# Usage:
#   pnpm demo:start       (from repo root)
#   bash scripts/demo-start.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE="bash scripts/container-compose.sh"

echo ""
echo "==> Starting database..."
$COMPOSE dev-db up -d

echo ""
echo "==> Waiting for database to be ready..."
until $COMPOSE dev-db exec -T db pg_isready -U postgres -q 2>/dev/null; do
  printf "."
  sleep 1
done
echo " ready."

echo ""
echo "==> Running migrations..."
pnpm --filter govea db:migrate

echo ""
echo "==> Seeding database..."
pnpm --filter govea db:seed

echo ""
echo "==> Starting dev server at http://localhost:3000"
echo "    Login: alice@govea.dev / dev-password"
echo ""
pnpm --filter govea dev
