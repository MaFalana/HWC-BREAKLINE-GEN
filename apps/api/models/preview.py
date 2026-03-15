"""
Preview response models for LiDAR data
"""

from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class PNEZDPoint(BaseModel):
    """PNEZD format point data"""
    point: int = Field(..., description="Point number")
    northing: float = Field(..., description="Northing (Y) coordinate rounded to 4 decimals")
    easting: float = Field(..., description="Easting (X) coordinate rounded to 4 decimals")
    elevation: float = Field(..., description="Elevation (Z) coordinate rounded to 4 decimals")
    description: str = Field(..., description="Point classification description")


class ElevationStatistics(BaseModel):
    """Elevation statistical summary"""
    min: float = Field(..., description="Minimum elevation")
    q1: float = Field(..., description="First quartile (25th percentile)")
    median: float = Field(..., description="Median elevation (50th percentile)")
    q3: float = Field(..., description="Third quartile (75th percentile)")
    max: float = Field(..., description="Maximum elevation")
    mean: float = Field(..., description="Mean elevation")
    std_dev: float = Field(..., description="Standard deviation")
    variance: float = Field(..., description="Variance")
    range: float = Field(..., description="Elevation range (max - min)")
    iqr: float = Field(..., description="Interquartile range (Q3 - Q1)")


class BoundingBox(BaseModel):
    """Spatial bounding box"""
    min_northing: float
    max_northing: float
    min_easting: float
    max_easting: float
    min_elevation: float
    max_elevation: float


class SpatialCoverage(BaseModel):
    """Spatial coverage information"""
    bounding_box: BoundingBox
    area_sq_meters: float
    area_acres: float
    area_hectares: float
    point_density: float = Field(..., description="Points per square meter")
    coordinate_system: Optional[str] = Field(None, description="EPSG code or coordinate system name")


class ClassificationCount(BaseModel):
    """Point classification count"""
    code: int
    name: str
    count: int
    percentage: float


class DataQuality(BaseModel):
    """Data quality metrics"""
    total_points: int
    classifications: List[ClassificationCount]
    return_types: Optional[Dict[str, int]] = None
    gps_time_range: Optional[Dict[str, float]] = None
    intensity_stats: Optional[Dict[str, float]] = None


class FileMetadata(BaseModel):
    """LAS/LAZ file metadata"""
    filename: str
    file_size_mb: float
    las_version: str
    point_data_format: int
    creation_date: Optional[datetime] = None
    generating_software: Optional[str] = None
    system_identifier: Optional[str] = None


class FilePreview(BaseModel):
    """Preview data for a single file"""
    preview_points: List[PNEZDPoint]
    elevation_statistics: ElevationStatistics
    spatial_coverage: SpatialCoverage
    data_quality: DataQuality
    file_metadata: FileMetadata

class JobPreviewResponse(BaseModel):
    """Complete preview response for a job"""
    job_id: str
    preview_points: List[PNEZDPoint]
    elevation_statistics: ElevationStatistics
    spatial_coverage: SpatialCoverage
    data_quality: DataQuality
    file_metadata: FileMetadata
    processing_time_ms: float
    total_processed_points: Optional[int] = Field(None, description="Total number of processed points (for completed jobs)")

class MultiFilePreviewResponse(BaseModel):
    """Preview response for jobs with multiple files"""
    job_id: str
    is_merge_job: bool
    file_count: int
    file_previews: List[FilePreview]
    merged_preview: Optional[FilePreview] = Field(None, description="Preview of merged data (for merge jobs)")
    processing_time_ms: float
    total_processed_points: Optional[int] = Field(None, description="Total number of processed points across all files (for completed jobs)")