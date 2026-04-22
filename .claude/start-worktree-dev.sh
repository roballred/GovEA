#!/bin/bash
exec /opt/homebrew/bin/pnpm \
  -C "/Users/roballred/Repos/Claude/govea-app/.claude/worktrees/wizardly-hugle-fae68b" \
  --filter govea \
  dev
