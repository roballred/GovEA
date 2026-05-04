#!/usr/bin/env bash
# scripts/container-compose.sh — runtime-agnostic compose helper
#
# Defaults to podman when installed; falls back to docker.
# Override with:  CONTAINER_RUNTIME=podman  or  CONTAINER_RUNTIME=docker
#
# Usage:
#   scripts/container-compose.sh <target> [compose args...]
#
# Targets:
#   dev-db   docker/podman-compose.dev.yml  or  docker/docker-compose.dev.yml
#   prod     docker/podman-compose.yml      or  docker/docker-compose.yml
#   demo     docker-compose.demo.yml        (compatible with either runtime)
#
# Examples:
#   scripts/container-compose.sh dev-db up -d
#   scripts/container-compose.sh dev-db exec -T db pg_isready -U postgres
#   CONTAINER_RUNTIME=docker scripts/container-compose.sh demo up --build

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Runtime detection ─────────────────────────────────────────────────────────

detect_runtime() {
  if [[ -n "${CONTAINER_RUNTIME:-}" ]]; then
    echo "$CONTAINER_RUNTIME"
  elif command -v podman &>/dev/null; then
    echo "podman"
  elif command -v docker &>/dev/null; then
    echo "docker"
  else
    echo "ERROR: neither podman nor docker found in PATH" >&2
    exit 1
  fi
}

RUNTIME="$(detect_runtime)"

# ── Target → compose file ─────────────────────────────────────────────────────

TARGET="${1:-}"
shift || true

case "$TARGET" in
  dev-db)
    if [[ "$RUNTIME" == "podman" ]]; then
      FILE="docker/podman-compose.dev.yml"
    else
      FILE="docker/docker-compose.dev.yml"
    fi
    ;;
  prod)
    if [[ "$RUNTIME" == "podman" ]]; then
      FILE="docker/podman-compose.yml"
    else
      FILE="docker/docker-compose.yml"
    fi
    ;;
  demo)
    FILE="docker-compose.demo.yml"
    ;;
  *)
    echo "Usage: container-compose.sh <target> [compose args...]" >&2
    echo "  Targets: dev-db  prod  demo" >&2
    exit 1
    ;;
esac

echo "Runtime: $RUNTIME  |  Compose file: $FILE"

# ── Dispatch ──────────────────────────────────────────────────────────────────

if [[ "$RUNTIME" == "podman" ]]; then
  if podman compose version &>/dev/null 2>&1; then
    exec podman compose -f "$FILE" "$@"
  elif command -v podman-compose &>/dev/null; then
    exec podman-compose -f "$FILE" "$@"
  else
    echo "ERROR: podman found but neither 'podman compose' nor 'podman-compose' is available." >&2
    echo "  Install with: pip install podman-compose  or  brew install podman-compose" >&2
    exit 1
  fi
else
  exec docker compose -f "$FILE" "$@"
fi
