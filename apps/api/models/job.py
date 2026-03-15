"""
Job models for tracking processing tasks
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
import uuid


class JobStatus(str, Enum):
    """Job status enumeration"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class JobBase(BaseModel):
    """Base job model with common fields"""
    processing_parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Processing parameters for the job"
    )


class JobCreate(JobBase):
    """Model for creating a new job"""
    input_files: List[str] = Field(
        ...,
        description="List of input file names",
        min_items=1
    )


class JobUpdate(BaseModel):
    """Model for updating job status"""
    status: Optional[JobStatus] = None
    output_files: Optional[List[str]] = None
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None
    processed_preview_points: Optional[Dict[str, List[Dict[str, Any]]]] = None
    total_processed_points: Optional[int] = None
    per_file_processed_points: Optional[Dict[str, int]] = None


class Job(JobBase):
    """Complete job model"""
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique job identifier"
    )
    status: JobStatus = Field(
        default=JobStatus.QUEUED,
        description="Current job status"
    )
    input_files: List[str] = Field(
        ...,
        description="List of input file blob names"
    )
    output_files: List[str] = Field(
        default_factory=list,
        description="List of output file blob names"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Job creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp"
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="Job completion timestamp"
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error message if job failed"
    )
    processed_preview_points: Optional[Dict[str, List[Dict[str, Any]]]] = Field(
        default=None,
        description="Processed preview points per input file: {filename: [points in PNEZD format]}"
    )
    total_processed_points: Optional[int] = Field(
        default=None,
        description="Total number of processed points across all files"
    )
    per_file_processed_points: Optional[Dict[str, int]] = Field(
        default=None,
        description="Number of processed points per input file: {filename: point_count}"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "completed",
                "input_files": ["uploads/123/terrain.las"],
                "output_files": ["outputs/123/terrain.dxf", "outputs/123/terrain.csv"],
                "processing_parameters": {
                    "voxel_size": 25,
                    "threshold": 0.5,
                    "output_formats": ["dxf", "csv"]
                },
                "created_at": "2024-01-01T12:00:00Z",
                "completed_at": "2024-01-01T12:05:00Z"
            }
        }


class JobEntity(BaseModel):
    """Azure Table entity representation of a job"""
    PartitionKey: str  # Date in YYYYMMDD format
    RowKey: str  # Job ID
    Status: str
    InputFiles: str  # JSON string
    OutputFiles: str  # JSON string
    ProcessingParameters: str  # JSON string
    CreatedAt: datetime
    UpdatedAt: datetime
    CompletedAt: Optional[datetime] = None
    ErrorMessage: Optional[str] = None
    ProcessedPreviewPoints: Optional[str] = None  # JSON string
    TotalProcessedPoints: Optional[int] = None
    
    @classmethod
    def from_job(cls, job: Job) -> "JobEntity":
        """Convert Job model to Azure Table entity"""
        import json
        return cls(
            PartitionKey=job.created_at.strftime("%Y%m%d"),
            RowKey=job.id,
            Status=job.status.value,
            InputFiles=json.dumps(job.input_files),
            OutputFiles=json.dumps(job.output_files),
            ProcessingParameters=json.dumps(job.processing_parameters),
            CreatedAt=job.created_at,
            UpdatedAt=job.updated_at,
            CompletedAt=job.completed_at,
            ErrorMessage=job.error_message,
            ProcessedPreviewPoints=json.dumps(job.processed_preview_points) if job.processed_preview_points else None,
            TotalProcessedPoints=job.total_processed_points
        )
    
    def to_job(self) -> Job:
        """Convert Azure Table entity to Job model"""
        import json
        return Job(
            id=self.RowKey,
            status=JobStatus(self.Status),
            input_files=json.loads(self.InputFiles),
            output_files=json.loads(self.OutputFiles) if self.OutputFiles else [],
            processing_parameters=json.loads(self.ProcessingParameters) if self.ProcessingParameters else {},
            created_at=self.CreatedAt,
            updated_at=self.UpdatedAt,
            completed_at=self.CompletedAt,
            error_message=self.ErrorMessage,
            processed_preview_points=json.loads(self.ProcessedPreviewPoints) if self.ProcessedPreviewPoints else None,
            total_processed_points=self.TotalProcessedPoints
        )