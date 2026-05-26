# GovEA — Downtime & Maintenance Posture

## Scenario 1 — Planned maintenance (app still running)

Set `MAINTENANCE_MODE=true` in the Azure Container App environment variables, then restart the revision. The Next.js middleware redirects all non-admin traffic to `/maintenance`. Admins who are already authenticated pass through; others can still reach `/login` to authenticate.

To re-open: unset the variable and restart.

**Azure CLI:**
```bash
# Enable
az containerapp update \
  --name "$GOVEA_AZURE_CONTAINERAPP" \
  --resource-group "$GOVEA_AZURE_RG" \
  --set-env-vars MAINTENANCE_MODE=true

# Disable
az containerapp update \
  --name "$GOVEA_AZURE_CONTAINERAPP" \
  --resource-group "$GOVEA_AZURE_RG" \
  --remove-env-vars MAINTENANCE_MODE
```

Or set via the Azure Portal → Container App → Settings → Environment variables.

---

## Scenario 2 — True downtime (container unreachable)

**Current posture:** best-effort via rolling deploys.

Azure Container Apps performs a rolling revision replacement — the old revision serves traffic until the new one passes health checks. A normal `./scripts/azure-dev.sh update` run has minimal true downtime. The main risk window is a slow `db:migrate` or `db:seed` that causes the new revision to fail its health probe before becoming healthy.

**There is no static fallback page for true downtime today.** Visitors see Azure's default error response.

### Options (not yet decided)

| Option | Complexity | Notes |
|---|---|---|
| Azure Front Door + Static Web Apps failover | High | Full CDN failover; overkill until traffic justifies cost |
| Azure Static Web Apps custom 404/maintenance page | Medium | Requires Front Door or Traffic Manager in front of Container Apps |
| Accept rolling-deploy gap as-is | None | Current posture; acceptable for pre-production and low-traffic deploys |

**Decision pending:** whether to put anything in front of the Container Apps URL. Until then, keep `db:migrate` fast and lean on rolling deploys to minimise the gap.
