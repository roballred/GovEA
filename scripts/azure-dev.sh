#!/usr/bin/env bash
# scripts/azure-dev.sh — GovEA Azure dev environment
#
# Usage: ./scripts/azure-dev.sh <command>
#
#   deploy   One-time setup: creates all Azure resources and does first deploy
#   update   Rebuild image, push, and roll out a new revision (no downtime)
#   start    Scale up to 1 replica (resume after stop)
#   stop     Scale to 0 replicas — no compute charges while stopped
#   logs     Stream live app logs
#   url      Print the app URL
#   status   Show current replica/image state
#   destroy  Delete all Azure resources (confirmation required)
#
# Prerequisites:
#   - az CLI installed and authenticated (az login)
#   - No local Docker daemon required — image builds run in Azure via az acr build
#   - Run from repo root

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────────
RG="govea-dev-rg"
LOCATION="eastus"
ACR="goveadevacr"
ACA_ENV="govea-dev-env"
ACA_APP="govea-dev"
# IMAGE is set at build time using a timestamp tag so Azure Container Apps
# always sees a new image reference and pulls the updated image.
IMAGE=""

# ── Helpers ────────────────────────────────────────────────────────────────────
log()  { echo ""; echo "==> $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }

require_deploy() {
  az containerapp show --name "$ACA_APP" --resource-group "$RG" \
    --query name -o tsv &>/dev/null \
    || die "App not deployed. Run: ./scripts/azure-dev.sh deploy"
}

acr_password() {
  az acr credential show --name "$ACR" --query "passwords[0].value" -o tsv
}

app_url() {
  local fqdn
  fqdn=$(az containerapp show --name "$ACA_APP" --resource-group "$RG" \
    --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || true)
  [[ -n "$fqdn" ]] && echo "https://${fqdn}" || echo "(not deployed)"
}

# Derive a stable 32-char secret from the subscription ID so it survives
# updates. Override by setting GOVEA_AUTH_SECRET before running.
auth_secret() {
  if [[ -n "${GOVEA_AUTH_SECRET:-}" ]]; then
    echo "$GOVEA_AUTH_SECRET"
  else
    az account show --query id -o tsv | shasum -a 256 | cut -c1-32
  fi
}

build_and_push() {
  # Build and push in Azure using ACR Tasks — no local Docker push needed.
  # Use a timestamp tag alongside :latest so ACA always sees a new image
  # reference and is forced to pull the updated image (avoids :latest caching).
  local tag
  tag="$(date +%Y%m%d-%H%M%S)"
  IMAGE="${ACR}.azurecr.io/govea-dev:${tag}"

  log "Building image in Azure (az acr build) — tag: ${tag}..."
  az acr build \
    --registry "$ACR" \
    --image "govea-dev:${tag}" \
    --image "govea-dev:latest" \
    --file docker/Containerfile.dev \
    .
}

# Create or update the Container App.
# $1 = app_url (for NEXT_PUBLIC_APP_URL and allowedOrigins)
deploy_containerapp() {
  local app_url="$1"
  local acr_pass
  acr_pass=$(acr_password)
  local secret
  secret=$(auth_secret)

  if az containerapp show --name "$ACA_APP" --resource-group "$RG" &>/dev/null; then
    # Already exists — just update the image
    az containerapp update \
      --name "$ACA_APP" \
      --resource-group "$RG" \
      --image "$IMAGE" \
      --output none
  else
    # First deploy: create app + add postgres sidecar
    az containerapp create \
      --name "$ACA_APP" \
      --resource-group "$RG" \
      --environment "$ACA_ENV" \
      --image "$IMAGE" \
      --registry-server "${ACR}.azurecr.io" \
      --registry-username "$ACR" \
      --registry-password "$acr_pass" \
      --command "/entrypoint.azure-dev.sh" \
      --cpu 2.0 \
      --memory 4Gi \
      --env-vars \
        "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/govea" \
        "AUTH_SECRET=${secret}" \
        "NEXT_PUBLIC_APP_URL=${app_url}" \
        "DEV=true" \
        "NODE_ENV=development" \
      --ingress external \
      --target-port 3000 \
      --min-replicas 1 \
      --max-replicas 1 \
      --output none

    # Add postgres as a sidecar (shares localhost with the app container)
    az containerapp update \
      --name "$ACA_APP" \
      --resource-group "$RG" \
      --container-name postgres \
      --image postgres:16-alpine \
      --set-env-vars "POSTGRES_DB=govea" "POSTGRES_USER=postgres" "POSTGRES_PASSWORD=postgres" \
      --cpu 0.5 \
      --memory 1Gi \
      --output none
  fi
}

# ── Commands ───────────────────────────────────────────────────────────────────

cmd_deploy() {
  log "Creating resource group (${RG})..."
  az group create --name "$RG" --location "$LOCATION" --output none

  log "Creating Azure Container Registry (${ACR}, Basic tier)..."
  az acr create \
    --resource-group "$RG" \
    --name "$ACR" \
    --sku Basic \
    --admin-enabled true \
    --output none

  build_and_push

  log "Creating Container Apps environment (${ACA_ENV})..."
  az containerapp env create \
    --name "$ACA_ENV" \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --output none

  # The environment's defaultDomain lets us calculate the FQDN before the
  # app exists, so NEXT_PUBLIC_APP_URL is correct from first boot.
  local env_domain
  env_domain=$(az containerapp env show \
    --name "$ACA_ENV" \
    --resource-group "$RG" \
    --query "properties.defaultDomain" -o tsv)
  local first_app_url="https://${ACA_APP}.${env_domain}"

  log "Deploying Container App..."
  deploy_containerapp "$first_app_url"

  echo ""
  echo "✓ Deployed!"
  echo "  URL : ${first_app_url}"
  echo ""
  echo "  The app is starting up — allow ~60 s for Postgres, migrations,"
  echo "  and seed data on first boot."
  echo ""
  echo "  To stream logs:  ./scripts/azure-dev.sh logs"
  echo "  To stop billing: ./scripts/azure-dev.sh stop"
}

cmd_update() {
  require_deploy
  build_and_push

  log "Rolling out new revision..."
  az containerapp update \
    --name "$ACA_APP" \
    --resource-group "$RG" \
    --container-name "$ACA_APP" \
    --image "$IMAGE" \
    --output none

  echo ""
  echo "✓ New revision is live."
  echo "  URL: $(app_url)"
}

cmd_start() {
  require_deploy
  log "Scaling up..."
  az containerapp update \
    --name "$ACA_APP" \
    --resource-group "$RG" \
    --min-replicas 1 \
    --max-replicas 1 \
    --output none
  echo "✓ Started: $(app_url)"
}

cmd_stop() {
  require_deploy
  log "Scaling to 0 replicas (no compute charges while stopped)..."
  az containerapp update \
    --name "$ACA_APP" \
    --resource-group "$RG" \
    --min-replicas 0 \
    --max-replicas 1 \
    --output none
  echo "✓ Stopped."
}

cmd_logs() {
  require_deploy
  az containerapp logs show \
    --name "$ACA_APP" \
    --resource-group "$RG" \
    --container app \
    --follow \
    --tail 50
}

cmd_url() {
  require_deploy
  app_url
}

cmd_status() {
  az containerapp show \
    --name "$ACA_APP" \
    --resource-group "$RG" \
    --query "{
      url: properties.configuration.ingress.fqdn,
      image: properties.template.containers[0].image,
      minReplicas: properties.template.scale.minReplicas,
      maxReplicas: properties.template.scale.maxReplicas
    }" \
    -o table 2>/dev/null \
    || echo "Not deployed. Run: ./scripts/azure-dev.sh deploy"
}

cmd_destroy() {
  echo "This will permanently delete the resource group '${RG}' and"
  echo "ALL resources inside it (ACR, Container Apps, images, etc.)."
  echo ""
  read -r -p "Type the resource group name to confirm: " confirm
  [[ "$confirm" == "$RG" ]] || die "Aborted."

  log "Deleting resource group ${RG}..."
  az group delete --name "$RG" --yes --no-wait
  echo "✓ Deletion queued (runs in background in Azure)."
}

# ── Entrypoint ─────────────────────────────────────────────────────────────────
case "${1:-help}" in
  deploy)   cmd_deploy   ;;
  update)   cmd_update   ;;
  start)    cmd_start    ;;
  stop)     cmd_stop     ;;
  logs)     cmd_logs     ;;
  url)      cmd_url      ;;
  status)   cmd_status   ;;
  destroy)  cmd_destroy  ;;
  help|*)
    cat <<'HELP'
Usage: ./scripts/azure-dev.sh <command>

  deploy   One-time setup and first deploy
  update   Rebuild image and roll out new revision (no downtime)
  start    Resume the app (scale to 1 replica)
  stop     Pause the app (scale to 0 — no compute charges)
  logs     Stream live logs
  url      Print the app URL
  status   Show current image / replica state
  destroy  Delete all Azure resources (permanent)

Cost notes:
  Container Apps consumption plan — no charge when stopped (min-replicas=0).
  ACR Basic tier is ~$5/month regardless of usage.
  Set GOVEA_AUTH_SECRET env var to pin the auth secret across redeploys.
HELP
    ;;
esac
