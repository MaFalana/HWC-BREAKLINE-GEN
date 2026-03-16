"""
Processing parameter models
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator


class ProcessingParameters(BaseModel):
    """Processing parameters for LiDAR data"""
    
    voxel_size: int = Field(
        default=25,
        description="Voxel size for downsampling",
        ge=1,
        le=100
    )
    threshold: float = Field(
        default=0.5,
        description="Gradient threshold for breakline detection",
        ge=0.1,
        le=5.0
    )
    nth_point: int = Field(
        default=1,
        description="Use every nth point from input",
        ge=1,
        le=100
    )
    source_epsg: Optional[int] = Field(
        default=None,
        description="Source coordinate system EPSG code",
        ge=1000,
        le=99999
    )
    target_epsg: Optional[int] = Field(
        default=None,
        description="Target coordinate system EPSG code",
        ge=1000,
        le=99999
    )
    output_formats: List[str] = Field(
        default=["dxf"],
        description="Output file formats",
        min_items=1
    )
    merge_outputs: bool = Field(
        default=False,
        description="Merge outputs from multiple input files"
    )
    merged_output_name: Optional[str] = Field(
        default=None,
        description="Name for merged output file"
    )
    
    @validator("output_formats")
    def validate_output_formats(cls, v):
        """Validate output formats"""
        allowed_formats = {"dxf", "csv"}
        for fmt in v:
            if fmt.lower() not in allowed_formats:
                raise ValueError(f"Invalid output format: {fmt}. Allowed: {allowed_formats}")
        return [fmt.lower() for fmt in v]
    
    @validator("target_epsg")
    def validate_reprojection(cls, v, values):
        """Validate reprojection parameters"""
        source_epsg = values.get("source_epsg")
        if v is not None and source_epsg is None:
            raise ValueError("source_epsg must be provided if target_epsg is specified")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "voxel_size": 25,
                "threshold": 0.5,
                "nth_point": 1,
                "output_formats": ["dxf", "csv"],
                "source_epsg": 2223,
                "target_epsg": 4326
            }
        }