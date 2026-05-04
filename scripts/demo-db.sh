#!/usr/bin/env bash
set -euo pipefail

# demo-db.sh — Start only the local Postgres dependency
#
# Use this when you want the database running but want to control the app
# server and migrations yourself (e.g. restarting the Next.js layer without
# touching DB state, or running pnpm dev separately in your editor).
#
# Runtime auto-detection: uses Podman when installed, falls back to Docker.
# Override with: CONTAINER_RUNTIME=docker bash scripts/demo-db.sh
#
# Usage:
#   pnpm demo:db            (from repo root)
#   bash scripts/demo-db.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo "==> Starting Postgres..."
bash scripts/container-compose.sh dev-db up -d

echo ""
echo "==> Waiting for Postgres to be ready..."
until node -e "require('net').createConnection(5432,'localhost').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do
  printf "."
  sleep 1
done
echo " ready."

echo ""
echo "  Connection: postgresql://postgres:postgres@localhost:5432/govea"
echo ""
echo "  Next steps (run in a separate terminal):"
echo "    pnpm --filter govea db:migrate  # run migrations"
echo "    pnpm --filter govea db:seed     # load seed data"
echo "    pnpm --filter govea dev         # start the app server"
echo ""
echo "  Or run everything at once:"
echo "    pnpm demo:start"
echo ""
echo "  To stop the database:"
echo "    pnpm demo:db:stop"
echo ""
