# HWC Breakline Generator

Monorepo for the HWC LiDAR surface/breakline generation platform.

## Structure

| Path | Description |
|---|---|
| `apps/api` | FastAPI backend — LiDAR processing, Azure Blob Storage, Cosmos DB |
| `apps/web` | Astro frontend — viewer and upload UI |
| `apps/web-0` | Legacy React frontend (Vite + Tailwind) |
| `packages/` | Shared frontend packages (assets, map, header, panel, potree) |

## Repository Secrets

- `AZURE_CREDENTIALS`
- `AZURE_RESOURCE_GROUP`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `AZURE_CONNECTION_STRING`
- `DOCKERHUB_TOKEN`
- `DOCKERHUB_USERNAME`
- `MONGO_CONNECTION_STRING`

## Repository Variables

- `NAME` — shared project name (blob container + MongoDB database)
- `PUBLIC_API_BASE_URL`

## CI/CD

- `.github/workflows/backend.yml` — builds Docker image, deploys API to Azure Container Apps
- `.github/workflows/frontend.yml` — builds Astro app, deploys to Azure Static Web Apps
