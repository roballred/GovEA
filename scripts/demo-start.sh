#!/bin/sh
# demo-start.sh — spin up the demo DB and start the dev server locally
# Usage: pnpm demo:start

set -e

echo "Starting demo DB..."
docker compose -f docker/docker-compose.dev.yml up -d

echo "Waiting for Postgres to be ready..."
until docker compose -f docker/docker-compose.dev.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
pnpm --filter govea db:migrate

echo "Seeding demo data..."
pnpm --filter govea db:seed

echo ""
echo "Demo ready — http://localhost:3000"
echo "Login shortcuts available on the login page (dev mode)"
echo "  alice@govea.dev  — Admin"
echo "  carol@govea.dev  — Contributor"
echo "  victor@govea.dev — Viewer"
echo "  (password: dev-password)"
echo ""

pnpm --filter govea dev
