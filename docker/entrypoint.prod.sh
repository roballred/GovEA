#!/bin/sh
# Production startup: wait for Postgres → run migrations → optional first-run setup → start server.
set -e

echo ""
echo "==> Waiting for database..."
until node -e "
  const n = require('net')
  const u = new URL(process.env.DATABASE_URL)
  const s = n.createConnection(parseInt(u.port) || 5432, u.hostname)
  s.on('connect', () => { s.destroy(); process.exit(0) })
  s.on('error', () => process.exit(1))
" 2>/dev/null; do
  sleep 2
done
echo "    Database ready."

echo ""
echo "==> Running migrations..."
node /app/db-tools/migrate.mjs

if [ -n "${GOVEA_SETUP_EMAIL}" ]; then
  echo ""
  echo "==> Running first-run setup..."
  node /app/db-tools/create-admin.mjs
fi

echo ""
echo "==> Starting server..."
exec node /app/apps/govea/server.js
