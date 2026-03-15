# Surface Generation Backend

A FastAPI-based backend server for processing LiDAR point cloud files and generating surface breaklines in DXF and CSV formats.

## Project Overview

This server allows users to:
- Upload LiDAR point cloud files (LAS/LAZ format)
- Process files to extract surface breaklines
- Download results in DXF and/or CSV formats
- Poll job status during processing
- Automatic cleanup of files after 4-24 hours

## Directory Structure

```
surface-gen-20250901/
├── app/                    # FastAPI application (to be implemented)
│   ├── main.py            # Application entry point
│   ├── config.py          # Configuration management
│   ├── models/            # Pydantic models
│   ├── routers/           # API endpoints
│   ├── services/          # Business logic
│   ├── db/                # Azure Tables integration
│   └── utils/             # Utilities and validators
│
├── source/                # Existing LiDAR processing code
│   ├── process.py         # Core LiDAR processing library
│   └── examples.py        # Usage examples
│
├── docs/                  # Documentation
│   ├── README.md          # Additional documentation
│   ├── TASKS.md           # Task tracking
│   └── PLAN.md            # Implementation plan
│
├── spec/                  # Project specifications
│   ├── Technical Stack.md
│   ├── Coding Preferences.md
│   ├── Communication Preferences.md
│   └── Workflow Preferences.md
│
├── assets/                # Static assets
│   └── [various files]
│
├── tests/                 # Test suite (to be implemented)
│
├── Dockerfile             # Production Docker configuration
├── Dockerfile.dev         # Development Docker configuration
├── Dockerfile.prod        # Production Docker configuration
├── requirements.txt       # Python dependencies
└── docker-compose.yml     # Docker compose configuration (to be created)
```

## Key Files

### `/source/process.py`
Core LiDAR processing library containing:
- `LiDARProcessor`: Main processing class
- `ProcessingParameters`: Configuration dataclass
- `ProcessingResult`: Result dataclass
- Methods for:
  - Reading LAS/LAZ files
  - Extracting ground points
  - Generating breaklines using Delaunay triangulation
  - Exporting to DXF and CSV formats
  - Coordinate system reprojection
  - File merging capabilities

### `/app/` (To be implemented)
FastAPI application structure:
- **routers/**: API endpoints for upload, download, job status
- **services/**: Azure Blob Storage, job management, file cleanup
- **models/**: Request/response models
- **db/**: Azure Tables integration for job tracking

### Configuration Files
- `requirements.txt`: Python dependencies including FastAPI, Azure SDKs, LiDAR processing libraries
- `Dockerfile.*`: Container configurations for different environments

## Technology Stack

- **Backend Framework**: FastAPI (Python)
- **File Storage**: Azure Blob Storage
- **Job Tracking**: Azure Tables
- **Processing Libraries**: laspy, numpy, scipy, open3d, ezdxf
- **Deployment**: Docker, Azure Services
- **Version Control**: GitHub
- **CI/CD**: GitHub Actions

## Processing Workflow

1. **Upload**: User uploads LAS/LAZ files via REST API
2. **Storage**: Files stored in Azure Blob Storage
3. **Job Creation**: Job record created in Azure Tables
4. **Processing**: Background task processes files using existing LiDAR library
5. **Output**: Results (DXF/CSV) stored in blob storage
6. **Download**: User downloads results via signed URLs
7. **Cleanup**: Automatic deletion after retention period

## Development Status

- ✅ Core LiDAR processing library complete
- ✅ Docker configurations ready
- ✅ Project planning complete
- 🚧 FastAPI server implementation pending
- 🚧 Azure integration pending
- 🚧 Testing suite pending

## Getting Started

See `docs/PLAN.md` for detailed implementation plan and `docs/TASKS.md` for current task tracking.