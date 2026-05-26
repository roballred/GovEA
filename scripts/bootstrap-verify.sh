#!/usr/bin/env bash
# scripts/bootstrap-verify.sh — Reproducible local verification (#35).
#
# Runs the canonical local validation sequence so anyone working on a fresh
# checkout can confirm their environment is healthy before they start
# editing. The same checks (minus the integration suite) are what CI runs
# on every PR, so a clean local run here predicts a clean CI run.
#
# Usage:
#   bash scripts/bootstrap-verify.sh
#   pnpm verify                # same thing via the root package script
#
# Optional flags via env vars:
#   SKIP_INSTALL=1   skip pnpm install (use when deps are known fresh)
#   WITH_INTEGRATION=1   also run the integration suite (requires a reachable
#                        Postgres via apps/govea/.env.local DATABASE_URL)
#
# Exit code 0 means: the same gates CI applies to your PR will pass on
# this commit on this machine.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Helpers ────────────────────────────────────────────────────────────────
NC='\033[0m'
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
BOLD='\033[1m'

step()  { printf "\n${BOLD}==> %s${NC}\n" "$*"; }
pass()  { printf "${GREEN}✓ %s${NC}\n" "$*"; }
fail()  { printf "${RED}✗ %s${NC}\n" "$*" >&2; }
skip()  { printf "${YELLOW}- %s (skipped)${NC}\n" "$*"; }

PASSED=()
FAILED=()
SKIPPED=()

run_check() {
  local name="$1"
  shift
  step "$name"
  if "$@"; then
    pass "$name"
    PASSED+=("$name")
  else
    fail "$name"
    FAILED+=("$name")
  fi
}

# ── Prerequisites ──────────────────────────────────────────────────────────
step "Checking prerequisites"

NODE_MAJOR=$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')
if [[ -z "${NODE_MAJOR:-}" ]]; then
  fail "node not found on PATH (need >= 20)"
  exit 1
fi
if (( NODE_MAJOR < 20 )); then
  fail "node $NODE_MAJOR detected; need >= 20"
  exit 1
fi
pass "node v$(node -v | sed 's/^v//') (>= 20)"

if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm not found on PATH (need >= 9 — run 'corepack enable pnpm')"
  exit 1
fi
PNPM_MAJOR=$(pnpm -v 2>/dev/null | cut -d. -f1)
if (( PNPM_MAJOR < 9 )); then
  fail "pnpm $(pnpm -v) detected; need >= 9"
  exit 1
fi
pass "pnpm $(pnpm -v) (>= 9)"

# ── Install dependencies ────────────────────────────────────────────────────
if [[ "${SKIP_INSTALL:-0}" == "1" ]]; then
  step "pnpm install"
  skip "pnpm install (SKIP_INSTALL=1)"
  SKIPPED+=("pnpm install")
else
  run_check "pnpm install --frozen-lockfile" \
    pnpm install --frozen-lockfile
fi

# ── Type check ──────────────────────────────────────────────────────────────
run_check "Type check (tsc --noEmit)" \
  pnpm --filter govea exec tsc --noEmit

# ── Lint ────────────────────────────────────────────────────────────────────
run_check "Lint (eslint)" \
  pnpm --filter govea lint

# ── Business-architecture docs lint ─────────────────────────────────────────
run_check "Docs lint (business-architecture/STYLE.md)" \
  node scripts/lint-business-architecture.mjs

# ── Optional: integration tests ─────────────────────────────────────────────
if [[ "${WITH_INTEGRATION:-0}" == "1" ]]; then
  if [[ ! -f apps/govea/.env.local ]]; then
    step "Integration tests (vitest)"
    fail "apps/govea/.env.local not found — set DATABASE_URL there before running with WITH_INTEGRATION=1"
    FAILED+=("Integration tests (vitest)")
  else
    run_check "Integration tests (vitest)" \
      pnpm --filter govea test:integration
  fi
else
  step "Integration tests (vitest)"
  skip "Integration tests — set WITH_INTEGRATION=1 to include (needs a reachable Postgres)"
  SKIPPED+=("Integration tests (vitest)")
fi

# ── Summary ─────────────────────────────────────────────────────────────────
# Use ${arr[@]+"${arr[@]}"} so `set -u` doesn't trip when arrays are empty —
# bash treats a reference to an empty array under set -u as unbound.
echo ""
printf "${BOLD}─── Summary ───────────────────────────────────────────────${NC}\n"
for c in ${PASSED[@]+"${PASSED[@]}"};  do pass "$c"; done
for c in ${SKIPPED[@]+"${SKIPPED[@]}"}; do skip "$c"; done
for c in ${FAILED[@]+"${FAILED[@]}"};  do fail "$c"; done

fail_count=${#FAILED[@]}
skip_count=${#SKIPPED[@]}

if (( fail_count > 0 )); then
  printf "\n${RED}${BOLD}✗ Verification failed (%d).${NC} See errors above.\n" "$fail_count"
  exit 1
fi

printf "\n${GREEN}${BOLD}✓ All checks passed.${NC} "
if (( skip_count > 0 )); then
  printf "(%d skipped — see flags above.)\n" "$skip_count"
else
  printf "\n"
fi
exit 0
