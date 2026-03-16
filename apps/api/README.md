# Surface Generation API

FastAPI backend for processing LiDAR point cloud files (LAS/LAZ) and generating surface breaklines in DXF and CSV formats.

## Architecture

```
apps/api/
├── app/
│   ├── main.py              # FastAPI entry point, lifespan, background job loop
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── models/              # Pydantic request/response models
│   ├── routers/
│   │   ├── upload.py        # POST /upload
│   │   ├── jobs.py          # GET/DELETE /jobs, preview, retry
│   │   ├── download.py      # GET /download (SAS URLs)
│   │   ├── health.py        # GET /health, /ready, /live
│   │   └── cleanup.py       # POST /cleanup/force, GET /cleanup/status
│   ├── services/
│   │   ├── storage.py       # Azure Blob Storage (async via executor)
│   │   ├── job_manager.py   # Job orchestration (MongoDB + Storage)
│   │   ├── processor.py     # Wraps source/process.py for async jobs
│   │   ├── preview.py       # Preview generation (live LAS + CSV-based)
│   │   └── cleanup.py       # Scheduled + forced cleanup
│   ├── db/
│   │   └── mongo_client.py  # Motor async MongoDB client (Cosmos DB)
│   └── utils/
│       ├── exceptions.py    # Custom HTTP exceptions
│       └── validators.py    # File validation, sanitization
├── source/
│   ├── process.py           # Core LiDAR processing engine
│   └── examples.py          # Standalone usage examples
├── pyproject.toml            # Python dependencies (single source of truth)
├── Dockerfile                # Production container image
└── .env                      # Local env vars (not committed)
```

## Blob Storage Layout

All files for a job live under a single prefix for easy cleanup:

```
jobs/{job_id}/input/filename.las     # uploaded LAS/LAZ files
jobs/{job_id}/output/filename.dxf    # processing outputs
jobs/{job_id}/output/filename_preview.csv
```

## Processing Flow

1. `POST /upload` — upload LAS/LAZ files + processing params
2. Files stored in Azure Blob Storage under `jobs/{job_id}/input/`
3. Job created in MongoDB with status `queued`
4. Background loop picks up queued jobs every 10s
5. Downloads files, runs LiDAR processing (ground filter → voxel downsample → breakline extraction)
6. Outputs (DXF, preview CSV) uploaded to `jobs/{job_id}/output/`
7. Job marked `completed` with output file paths
8. `GET /download/{job_id}` returns time-limited SAS URLs
9. Cleanup service deletes `jobs/{job_id}/` entirely after 24h retention

## Job Lifecycle

```
queued → processing → completed
                    → failed (error or cancelled)
```

- Cancel (`DELETE /jobs/{id}`) works on queued or processing jobs, cleans up blobs
- Retry (`POST /jobs/{id}/retry`) validates input files still exist, resets to queued
- Processing loop re-checks job status after processing to respect mid-flight cancellations

## Preview System

For completed jobs, a lightweight `_preview.csv` is generated during processing containing the first 50 PNEZD points. The preview endpoint reads this CSV directly from blob storage — no LAS re-parsing needed.

For in-progress/queued jobs, preview falls back to live LAS file analysis.

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
pip install fastapi "uvicorn[standard]" pydantic-settings python-dotenv azure-storage-blob motor pymongo laspy laszip numpy scipy ezdxf pyproj open3d pdal shapely matplotlib pandas geopandas lxml python-multipart aiofiles
uvicorn app.main:app --reload
```

## Deployment

Docker image built and pushed via GitHub Actions (`.github/workflows/backend.yml`), deployed to Azure Container Apps.
