"""
API response models
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .job import JobStatus


class UploadResponse(BaseModel):
    """Response model for file upload"""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Initial job status")
    message: str = Field(..., description="Status message")
    files_uploaded: int = Field(..., description="Number of files uploaded")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "queued",
                "message": "Files uploaded successfully. Processing will begin shortly.",
                "files_uploaded": 2
            }
        }


class JobStatusResponse(BaseModel):
    """Response model for job status query"""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    progress: Optional[float] = Field(None, description="Progress percentage (0-100)")
    input_files: List[str] = Field(..., description="Input file names")
    output_files: List[str] = Field(default_factory=list, description="Output file names")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "completed",
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:05:00Z",
                "completed_at": "2024-01-01T12:05:00Z",
                "progress": 100.0,
                "input_files": ["terrain.las"],
                "output_files": ["terrain.dxf", "terrain.csv"]
            }
        }


class DownloadResponse(BaseModel):
    """Response model for file download"""
    job_id: str = Field(..., description="Job identifier")
    download_urls: Dict[str, str] = Field(..., description="Map of filename to download URL")
    expires_at: datetime = Field(..., description="URL expiration time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "download_urls": {
                    "terrain.dxf": "https://storage.blob.core.windows.net/...",
                    "terrain.csv": "https://storage.blob.core.windows.net/..."
                },
                "expires_at": "2024-01-01T13:00:00Z"
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str = Field(..., description="Error description")
    status_code: int = Field(..., description="HTTP status code")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    path: Optional[str] = Field(None, description="Request path")
    
    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Job not found",
                "status_code": 404,
                "timestamp": "2024-01-01T12:00:00Z",
                "path": "/api/v1/jobs/invalid-id"
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    version: str = Field(..., description="API version")
    services: Dict[str, bool] = Field(..., description="Service availability")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2024-01-01T12:00:00Z",
                "version": "1.0.0",
                "services": {
                    "azure_storage": True,
                    "mongodb": True,
                    "processor": True
                }
            }
        }


class JobListResponse(BaseModel):
    """Response for listing jobs"""
    jobs: List[JobStatusResponse] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs")
    page: int = Field(default=1, description="Current page")
    page_size: int = Field(default=20, description="Items per page")
    
    class Config:
        json_schema_extra = {
            "example": {
                "jobs": [
                    {
                        "job_id": "123e4567-e89b-12d3-a456-426614174000",
                        "status": "completed",
                        "created_at": "2024-01-01T12:00:00Z",
                        "input_files": ["terrain.las"]
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 20
            }
        }