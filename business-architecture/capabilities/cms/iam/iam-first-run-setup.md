# Capability: First-Run Setup

## What It Does
On first launch, the system must guide the administrator through creating the initial Admin account and configuring the database and basic site settings. The system must not be accessible to other users until setup is complete.

## Personas
- **CMS Administrator** — completes first-run setup before handing the system over to other users

## Behaviors
- Detect when no users exist and redirect to the setup wizard automatically
- Collect the initial Admin account name, email, and password
- Collect basic organization name and site settings
- Complete setup and redirect to the admin dashboard
- Block all non-setup routes until setup is complete
- Support headless/automated setup via environment variables for Docker and CI deployments

## Rules
- First-run setup runs exactly once — it cannot be re-triggered after an Admin account exists
- The initial Admin account created during setup cannot be automatically deactivated
- Automated setup via environment variables must produce the same result as the UI wizard

## Links
- Depends on: User Management, Role-Based Access Control, Local Authentication
- Related: IAM Audit Trail
