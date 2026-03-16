# HWC Breakline Generator

Monorepo for the HWC LiDAR surface/breakline generation platform.

## Structure

| Path | Description |
|---|---|
| `apps/api` | FastAPI backend — LiDAR processing, Azure Blob Storage, Cosmos DB |
| `apps/web` | Astro + React frontend — file upload, configuration, preview, download |
| `packages/` | Shared frontend packages (`assets`, `header`, `ui`, `map`, `panel`, `potree`, `photo-panel`) |

## Quick Start

```bash
# Install all workspace dependencies
npm install

# Sync shared assets into each app
npm run assets:sync

# Start both frontend and API locally
npm run dev
```

- Frontend: `http://localhost:4321`
- API: `http://localhost:8000`

See [`apps/api/README.md`](apps/api/README.md) and [`apps/web/README.md`](apps/web/README.md) for app-specific details.

## Repository Secrets

| Secret | Usage |
|---|---|
| `AZURE_CREDENTIALS` | Azure service principal for CLI login |
| `AZURE_RESOURCE_GROUP` | Target resource group |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deploy token for Azure Static Web Apps |
| `AZURE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `MONGO_CONNECTION_STRING` | Cosmos DB (MongoDB API) connection string |
| `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` | Docker Hub push credentials |

## Repository Variables

| Variable | Usage |
|---|---|
| `NAME` | Shared project name (blob container + MongoDB database + Static Web App name) |
| `PUBLIC_API_BASE_URL` | API base URL injected at frontend build time |

## CI/CD

| Workflow | Trigger | Target |
|---|---|---|
| `.github/workflows/backend.yml` | Push to `main` (changes in `apps/api/`) | Docker Hub → Azure Container Apps |
| `.github/workflows/frontend.yml` | Push to `main` (changes in `apps/web/`) | Azure Static Web Apps |
