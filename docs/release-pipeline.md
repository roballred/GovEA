# Release Pipeline

GovEA is a public open-source repository, so operator-specific deployment
configuration must not live here. Public GitHub Actions workflow files, run
history, job summaries, and logs are visible to anyone who can read the
repository.

## Current Policy

- CI and PR checks stay in this public repository.
- Azure deployment, rollback, and schedule automation should live in a private
  operator-owned repository or run locally from an authenticated operator
  workstation.
- Do not commit Azure subscription IDs, tenant IDs, resource group names,
  registry names, Container App names, public demo FQDNs, or other
  account-specific deployment identifiers to this repository.
- Keep Azure secrets in the operator-controlled automation context, never in
  repo files.

## Local Helper

The local helper remains available at `scripts/azure-dev.sh`, but it now reads
target Azure resource names from environment variables:

```bash
export GOVEA_AZURE_RG="<resource-group>"
export GOVEA_AZURE_ACR="<registry-name>"
export GOVEA_AZURE_CONTAINERAPP_ENV="<container-apps-environment>"
export GOVEA_AZURE_CONTAINERAPP="<container-app>"

bash scripts/azure-dev.sh status
bash scripts/azure-dev.sh update
```

Optional variables:

```bash
export GOVEA_AZURE_LOCATION="eastus"
export GOVEA_AZURE_IMAGE_REPO="govea-app"
export GOVEA_AUTH_SECRET="<stable-32-char-secret>"
```

## Private Automation Shape

A private ops repository can safely hold the GitHub Actions deployment workflow
that points to the operator's Azure subscription. Recommended shape:

1. Checkout this public repo at a reviewed commit SHA.
2. Build the container image into the private Azure Container Registry.
3. Deploy the image to the private Azure Container App.
4. Record commit SHA, image tag, digest, revision, and smoke-test result in the
   private workflow summary.
5. Keep rollback and start/stop schedules in the private ops repository.

This keeps the public GovEA repository useful for contributors while keeping
operator account topology out of public source, public workflow definitions,
and public Actions logs.
