# Release Pipeline (Azure dev)

This document describes the traceable release pipeline for the GovEA Azure
dev demo &mdash; how it deploys, what to look for after a deploy, and how to
roll back. The forward path is automated; rollback is one click on a manual
workflow.

Issue: [#504](https://github.com/roballred/GovEA/issues/504)
Risk: [`docs/risk-register.md`](./risk-register.md) R-002

---

## What runs when

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| Deploy Azure dev | `.github/workflows/deploy-azure-dev.yml` | After every successful CI run on `main` (`workflow_run`) or manual `workflow_dispatch` | Builds an immutable image in ACR tagged with the commit SHA + run number, deploys it as a new Container App revision, runs a post-deploy smoke check |
| Rollback Azure dev | `.github/workflows/rollback-azure-dev.yml` | Manual `workflow_dispatch` with a revision name | Activates a previously-built revision &mdash; no rebuild |

PRs do not deploy. Only merges to `main` (or explicit manual dispatch) push
to the dev environment.

---

## What you get in the job summary

Every deploy run writes a release summary to `$GITHUB_STEP_SUMMARY` so the
PR / merge audit answers the &ldquo;what is live right now?&rdquo; question without
shell access:

| Field | Meaning |
|---|---|
| Commit | The exact `main` SHA the image was built from |
| Image tag | `commit-<short>-run<n>` — unique per build |
| Image | Full ACR path |
| Digest | The content-addressable image digest (immutable identity) |
| Revision | The Container Apps revision name &mdash; pass this to rollback |
| URL | The live demo URL |
| Smoke check | `ok` / `fail` / `not-run` |

The same digest is recorded in ACR; the same revision name is visible via
`./scripts/azure-dev.sh revisions` locally.

---

## Smoke check coverage

After the revision is healthy the workflow hits the live URL with three
unauthenticated requests:

1. **`/login` returns HTTP 200** and contains the literal text `Sign in`.
2. **The demo dev-shortcut button text is present** (`Riverdale Admin`).
   If absent, `DEMO_MODE` is not active in the new revision &mdash; a runtime
   env regression that must be fixed before merging the next demo-affecting
   change.
3. **`/dashboard` does not return 5xx.** Anonymous requests should
   redirect to `/login`; a 5xx means the runtime is unhealthy.

A failed smoke check fails the workflow but does **not** automatically roll
back &mdash; that&apos;s an operator decision (see below).

---

## Rollback

1. Identify the previous known-good revision from a prior deploy summary,
   or with:
   ```bash
   ./scripts/azure-dev.sh revisions
   ```
2. Trigger the **Rollback Azure dev** workflow from the GitHub Actions tab.
3. Paste the revision name in (e.g. `govea-dev--abc1234-r12`) and an optional
   reason; the workflow summary records both.
4. The workflow verifies the revision exists, activates it, and prints the
   currently-active revision + URL.

No rebuild happens. Rollback is fast because the immutable image already
lives in ACR.

If the &ldquo;previous known-good&rdquo; isn&apos;t obvious, fall back to the manual
helper script:

```bash
./scripts/azure-dev.sh status       # what is live now
./scripts/azure-dev.sh revisions    # all revisions, newest first
az containerapp revision activate \
  --name govea-dev --resource-group govea-dev-rg \
  --revision <name>
```

---

## One-time Azure setup (maintainer only)

The workflow uses **OIDC federated credentials** so no long-lived
service-principal secret needs to live in the repo. The three secrets
below identify *which* Azure tenant/subscription/app registration to
exchange the GitHub OIDC token for &mdash; they are not themselves
credentials.

### 1. Create an Azure AD app registration

```bash
az ad app create --display-name govea-github-actions
# Copy the appId; export AZURE_CLIENT_ID=<appId>
```

### 2. Create a service principal for it and grant Contributor on the RG

```bash
az ad sp create --id "$AZURE_CLIENT_ID"

AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az role assignment create \
  --assignee "$AZURE_CLIENT_ID" \
  --role Contributor \
  --scope "/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/govea-dev-rg"
```

You may also need `AcrPush` on the registry if Contributor is scoped tighter
than the RG:

```bash
az role assignment create \
  --assignee "$AZURE_CLIENT_ID" \
  --role AcrPush \
  --scope "/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/govea-dev-rg/providers/Microsoft.ContainerRegistry/registries/goveadevacr"
```

### 3. Add federated credentials for the repo

Two are needed: one for pushes to `main` (CI-chained deploys) and one for
manual `workflow_dispatch` runs.

```bash
REPO=roballred/GovEA

# main branch
az ad app federated-credential create --id "$AZURE_CLIENT_ID" --parameters '{
  "name": "govea-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$REPO"':ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# workflow_dispatch (any ref)
az ad app federated-credential create --id "$AZURE_CLIENT_ID" --parameters '{
  "name": "govea-dispatch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$REPO"':environment:azure-dev",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

### 4. Set GitHub repo secrets

| Secret | Source |
|---|---|
| `AZURE_CLIENT_ID` | Output of step 1 |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |
| `GOVEA_AUTH_SECRET` _(optional)_ | A 32-char auth secret if you want to pin it instead of deriving from the subscription ID |

Set them under **Settings &rarr; Secrets and variables &rarr; Actions**.

### 5. (First time only) Make sure the dev environment already exists

The workflow assumes `./scripts/azure-dev.sh deploy` has been run once to
create the RG, ACR, Container App environment, and the `govea-dev`
Container App itself. The workflow only *updates* the existing app &mdash; it
does not create from scratch (intentional: creation is a human decision).

---

## Operating rules

- **Humans merge PRs.** This workflow runs *after* a maintainer-approved
  merge to `main`, never as part of the PR check itself.
- **One deploy at a time.** The `azure-dev-deploy` concurrency group
  serializes deploys *and* rollbacks &mdash; you can&apos;t race them.
- **Failed smoke does not auto-rollback.** Investigate first; the
  failing revision is still flagged as the latest, so the demo may be
  serving 5xx until someone acts. The Rollback Azure dev workflow is one
  click and ~30 seconds.
- **Cost.** The deploy step uses Azure compute (ACR build minutes,
  Container Apps revision creation). The dev RG&apos;s ACR is Basic tier
  (~$5/month). Container Apps consumption-plan compute bills only while
  replicas are non-zero.
