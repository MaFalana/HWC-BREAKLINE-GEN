# Surface Generation API

FastAPI backend for processing LiDAR point cloud files (LAS/LAZ) and generating surface breaklines in DXF and CSV formats.

## Architecture

```
apps/api/
├── app/
│   ├── main.py              # FastAPI entry point, lifespan, background job loop
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── models/              # Pydantic request/response models
│   ├── routers/             # API endpoint handlers
│   │   ├── upload.py        # POST /upload — file upload + job creation
│   │   ├── jobs.py          # GET/DELETE /jobs — status, preview, retry, diagnostic
│   │   ├── download.py      # GET /download — SAS URL generation
│   │   ├── health.py        # GET /health — liveness/readiness
│   │   └── cleanup.py       # POST /cleanup — manual + orphan cleanup
│   ├── services/            # Business logic
│   │   ├── storage.py       # Azure Blob Storage operations
│   │   ├── job_manager.py   # Job CRUD via MongoDB
│   │   ├── processor.py     # Wraps source/process.py for async job processing
│   │   ├── preview.py       # LAS/LAZ file preview generation
│   │   └── cleanup.py       # Scheduled + forced file/job cleanup
│   ├── db/
│   │   └── mongo_client.py  # Motor async MongoDB client (Cosmos DB)
│   └── utils/
│       ├── exceptions.py    # Custom HTTP exceptions
│       └── validators.py    # File validation, sanitization
├── source/
│   ├── process.py           # Core LiDAR processing engine
│   └── examples.py          # Usage examples
├── pyproject.toml            # Python dependencies (single source of truth)
├── Dockerfile                # Production container image
└── .env                      # Local env vars (not committed)
```

## Processing Flow

1. Upload LAS/LAZ files → stored in Azure Blob Storage
2. Job created in MongoDB (Cosmos DB) with status `queued`
3. Background loop picks up queued jobs, downloads files, runs LiDAR processing
4. Output DXF/CSV uploaded to blob storage, job marked `completed`
5. Download via time-limited SAS URLs
6. Cleanup service deletes old jobs + files after retention period

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `MONGO_CONNECTION_STRING` | Cosmos DB MongoDB connection string |
| `NAME` | Shared name for blob container + MongoDB database |

See `env.example` for template.

## Local Development

```bash
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Or from the monorepo root:

```bash
npm run dev:api
```

## Deployment

Deployed as an Azure Container App via GitHub Actions (`.github/workflows/backend.yml`).
Docker image pushed to Docker Hub, then deployed to Azure Container Apps.
