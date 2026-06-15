# Routine Info Workflow

React/Vite application with Azure Functions and Azure SQL, deployed through
Azure Static Web Apps.

## Prerequisites

- Node.js 20
- Azure Functions Core Tools for local API execution
- Azure SQL database with the scripts in `migrations/` applied

## Required API settings

- `DB_SERVER`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET` with at least 32 random characters

The SQL account should have only the permissions required by this application.
Do not enable `trustServerCertificate` or commit local settings and secrets.

## Local validation

```text
npm ci
npm run check
cd api
npm ci
npm run check
```

The first administrator must be provisioned directly in Azure SQL with a
bcrypt password hash. After login, administrators create additional users from
the application administration panel.

## Deployment

Add an `AZURE_SQL_CONNECTION_STRING` repository or production-environment
secret with a least-privilege Azure SQL deployment account. The Azure SQL
server must allow the GitHub Actions runner to connect.

On pushes to `main`, GitHub Actions validates the frontend and API, applies the
numbered scripts in `migrations/`, and deploys the application only after the
database migration succeeds.
