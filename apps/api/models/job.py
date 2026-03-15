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


class Job(BaseModel):
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
    processing_parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Processing parameters for the job"
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
    total_processed_points: Optional[int] = Field(
        default=None,
        description="Total number of processed points across all files"
    )
