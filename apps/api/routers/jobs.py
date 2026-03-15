"""
Job management endpoints
"""

import logging
from typing import Optional, Union
from fastapi import APIRouter, HTTPException, Query

from app.models.responses import JobStatusResponse, JobListResponse
from app.models.job import JobStatus
from app.models.preview import JobPreviewResponse, MultiFilePreviewResponse
from app.services.job_manager import JobManager
from app.services.preview import PreviewService
from app.utils.exceptions import JobNotFoundException


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Get job status",
    description="Get the current status and details of a processing job"
)
async def get_job_status(job_id: str):
    """
    Get job status by ID
    """
    try:
        job_manager = JobManager()
        job = await job_manager.get_job(job_id)
        progress = await job_manager.get_job_progress(job_id)
        
        return JobStatusResponse(
            job_id=job.id,
            status=job.status,
            created_at=job.created_at,
            updated_at=job.updated_at,
            completed_at=job.completed_at,
            progress=progress,
            input_files=[blob.split("/")[-1] for blob in job.input_files],
            output_files=[blob.split("/")[-1] for blob in job.output_files],
            error_message=job.error_message
        )
        
    except JobNotFoundException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to get job status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job status")


@router.get(
    "/",
    response_model=JobListResponse,
    summary="List jobs",
    description="List processing jobs with optional filtering"
)
async def list_jobs(
    status: Optional[JobStatus] = Query(None, description="Filter by job status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    days_back: int = Query(7, ge=1, le=30, description="Days to look back")
):
    """
    List jobs with pagination and filtering
    """
    try:
        job_manager = JobManager()
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get jobs
        all_jobs = await job_manager.list_jobs(
            status=status,
            limit=page_size + offset,
            days_back=days_back
        )
        
        # Paginate
        jobs = all_jobs[offset:offset + page_size]
        
        # Convert to response models
        job_responses = []
        for job in jobs:
            progress = await job_manager.get_job_progress(job.id)
            job_responses.append(
                JobStatusResponse(
                    job_id=job.id,
                    status=job.status,
                    created_at=job.created_at,
                    updated_at=job.updated_at,
                    completed_at=job.completed_at,
                    progress=progress,
                    input_files=[blob.split("/")[-1] for blob in job.input_files],
                    output_files=[blob.split("/")[-1] for blob in job.output_files],
                    error_message=job.error_message
                )
            )
        
        return JobListResponse(
            jobs=job_responses,
            total=len(all_jobs),
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Failed to list jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list jobs")


@router.delete(
    "/{job_id}",
    summary="Cancel a job",
    description="Cancel a queued or processing job"
)
async def cancel_job(job_id: str):
    """
    Cancel a job
    """
    try:
        job_manager = JobManager()
        job = await job_manager.cancel_job(job_id)
        
        return {
            "job_id": job.id,
            "status": job.status,
            "message": "Job cancelled successfully"
        }
        
    except JobNotFoundException as e:
        raise e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to cancel job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel job")


@router.post(
    "/{job_id}/retry",
    summary="Retry a failed job",
    description="Retry a failed job with validation and improved error handling"
)
async def retry_job(job_id: str):
    """
    Retry a failed job with enhanced validation
    """
    try:
        job_manager = JobManager()
        job = await job_manager.get_job(job_id)
        
        # Check if job can be retried
        if job.status not in [JobStatus.FAILED]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot retry job in {job.status.value} status. Only failed jobs can be retried."
            )
        
        # Validate that input files exist before retrying
        from app.services.storage import StorageService
        storage_service = StorageService()
        missing_files = []
        
        for input_file in job.input_files:
            # All input files are stored as full blob paths: uploads/job_id/filename.las
            blob_path = input_file
                
            try:
                exists = await storage_service.blob_exists(blob_path)
                if not exists:
                    missing_files.append(blob_path)
            except Exception as e:
                missing_files.append(f"{blob_path} (validation error: {str(e)})")
        
        if missing_files:
            return {
                "job_id": job_id,
                "status": job.status.value,
                "message": "Cannot retry job: input files missing from Azure Blob Storage",
                "missing_files": missing_files,
                "recommendation": "Re-upload the files or create a new job"
            }
        
        # Reset job status to queued with clean state
        updated_job = await job_manager.update_job_status(
            job_id,
            JobStatus.QUEUED,
            error_message=None
        )
        
        return {
            "job_id": updated_job.id,
            "status": updated_job.status,
            "message": "Job validated and queued for retry",
            "validated_files": len(job.input_files)
        }
        
    except JobNotFoundException as e:
        raise e
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retry job")


@router.get(
    "/{job_id}/preview",
    response_model=Union[JobPreviewResponse, MultiFilePreviewResponse],
    summary="Get job data preview",
    description="Get preview of first 50 points in PNEZD format with comprehensive statistics"
)
async def get_job_preview(job_id: str):
    """
    Get preview data for a job's input file
    
    Returns:
    - First 50 points in PNEZD format
    - Elevation statistics (five-number summary, std dev, etc.)
    - Spatial coverage information
    - Data quality metrics
    - File metadata
    """
    try:
        # Get job details
        job_manager = JobManager()
        job = await job_manager.get_job(job_id)
        
        # Check if job has input files
        if not job.input_files:
            raise HTTPException(
                status_code=400,
                detail="Job has no input files"
            )
        
        # Check if job has processed preview points (for completed jobs)
        if job.status == JobStatus.COMPLETED and job.processed_preview_points:
            # Return processed preview points for completed jobs
            return await _create_processed_preview_response(job)
        
        # For non-completed jobs or jobs without processed points, use original preview generation
        preview_service = PreviewService()
        
        if len(job.input_files) == 1:
            # Single file - use existing preview method
            preview_data = await preview_service.generate_preview(job_id, job.input_files[0])
            return preview_data
        else:
            # Multiple files - use new multi-file preview
            is_merge_job = job.processing_parameters.get("merge_outputs", False)
            preview_data = await preview_service.generate_multi_file_preview(
                job_id, 
                job.input_files,
                is_merge_job
            )
            return preview_data
        
    except JobNotFoundException as e:
        raise e
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job preview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")



async def _create_processed_preview_response(job) -> Union[JobPreviewResponse, MultiFilePreviewResponse]:
    """
    Create preview response from stored processed preview points
    
    Args:
        job: Job object with processed_preview_points
        
    Returns:
        Preview response based on number of files
    """
    from app.models.preview import (
        PNEZDPoint, JobPreviewResponse, MultiFilePreviewResponse, 
        FilePreview, ElevationStatistics, SpatialCoverage, 
        DataQuality, FileMetadata, BoundingBox
    )
    
    # Convert stored points back to PNEZDPoint objects
    def dict_to_pnezd_point(point_dict: dict) -> PNEZDPoint:
        return PNEZDPoint(**point_dict)
    
    if len(job.input_files) == 1:
        # Single file response
        input_file = job.input_files[0]
        # Handle both full blob paths and just filenames
        filename = input_file.split("/")[-1] if '/' in input_file else input_file
        # Look up using the full filename (with extension) as that's how it's stored
        points_data = job.processed_preview_points.get(filename, [])
        preview_points = [dict_to_pnezd_point(p) for p in points_data]
        
        # Create basic statistics from processed points
        if preview_points:
            elevations = [p.elevation for p in preview_points]
            elevation_stats = ElevationStatistics(
                min=min(elevations),
                q1=sorted(elevations)[len(elevations)//4] if len(elevations) > 4 else min(elevations),
                median=sorted(elevations)[len(elevations)//2],
                q3=sorted(elevations)[3*len(elevations)//4] if len(elevations) > 4 else max(elevations),
                max=max(elevations),
                mean=sum(elevations) / len(elevations),
                std_dev=0.0,  # Simplified
                variance=0.0,  # Simplified
                range=max(elevations) - min(elevations),
                iqr=0.0  # Simplified
            )
            
            # Basic spatial coverage
            northings = [p.northing for p in preview_points]
            eastings = [p.easting for p in preview_points]
            spatial_coverage = SpatialCoverage(
                bounding_box=BoundingBox(
                    min_northing=min(northings),
                    max_northing=max(northings),
                    min_easting=min(eastings),
                    max_easting=max(eastings),
                    min_elevation=min(elevations),
                    max_elevation=max(elevations)
                ),
                area_sq_meters=0.0,  # Simplified
                area_acres=0.0,
                area_hectares=0.0,
                point_density=0.0,
                coordinate_system="Processed"
            )
        else:
            # Empty defaults
            elevation_stats = ElevationStatistics(min=0, q1=0, median=0, q3=0, max=0, mean=0, std_dev=0, variance=0, range=0, iqr=0)
            spatial_coverage = SpatialCoverage(
                bounding_box=BoundingBox(min_northing=0, max_northing=0, min_easting=0, max_easting=0, min_elevation=0, max_elevation=0),
                area_sq_meters=0, area_acres=0, area_hectares=0, point_density=0, coordinate_system="Processed"
            )
        
        # Get the actual processed points count for this single file
        file_processed_points = 0
        if job.per_file_processed_points and filename in job.per_file_processed_points:
            file_processed_points = job.per_file_processed_points[filename]
        elif job.total_processed_points:
            # Fallback: use total processed points for single file jobs
            file_processed_points = job.total_processed_points
        
        # Use actual total processed points if available, otherwise fallback
        total_processed_points = job.total_processed_points
        if total_processed_points is None:
            # Fallback: estimate from preview points (this is a sample, not the total)
            total_processed_points = len(preview_points) if preview_points else 0
        
        return JobPreviewResponse(
            job_id=job.id,
            preview_points=preview_points,
            elevation_statistics=elevation_stats,
            spatial_coverage=spatial_coverage,
            data_quality=DataQuality(total_points=file_processed_points, classifications=[], return_types=None, gps_time_range=None, intensity_stats=None),
            file_metadata=FileMetadata(filename=filename, file_size_mb=0, las_version="Processed", point_data_format=0, creation_date=None, generating_software="Surface Generation API", system_identifier=None),
            processing_time_ms=0.0,
            total_processed_points=total_processed_points
        )
    else:
        # Multi-file response
        file_previews = []
        for filename, points_data in job.processed_preview_points.items():
            preview_points = [dict_to_pnezd_point(p) for p in points_data]
            
            # Basic statistics for this file
            if preview_points:
                elevations = [p.elevation for p in preview_points]
                elevation_stats = ElevationStatistics(
                    min=min(elevations), q1=min(elevations), median=sorted(elevations)[len(elevations)//2],
                    q3=max(elevations), max=max(elevations), mean=sum(elevations)/len(elevations),
                    std_dev=0, variance=0, range=max(elevations)-min(elevations), iqr=0
                )
                northings = [p.northing for p in preview_points]
                eastings = [p.easting for p in preview_points]
                spatial_coverage = SpatialCoverage(
                    bounding_box=BoundingBox(
                        min_northing=min(northings), max_northing=max(northings),
                        min_easting=min(eastings), max_easting=max(eastings),
                        min_elevation=min(elevations), max_elevation=max(elevations)
                    ),
                    area_sq_meters=0, area_acres=0, area_hectares=0, point_density=0, coordinate_system="Processed"
                )
            else:
                elevation_stats = ElevationStatistics(min=0, q1=0, median=0, q3=0, max=0, mean=0, std_dev=0, variance=0, range=0, iqr=0)
                spatial_coverage = SpatialCoverage(
                    bounding_box=BoundingBox(min_northing=0, max_northing=0, min_easting=0, max_easting=0, min_elevation=0, max_elevation=0),
                    area_sq_meters=0, area_acres=0, area_hectares=0, point_density=0, coordinate_system="Processed"
                )
            
            # Get the actual processed points count for this specific file
            file_processed_points = 0
            if job.per_file_processed_points and filename in job.per_file_processed_points:
                file_processed_points = job.per_file_processed_points[filename]
            else:
                # Fallback: use preview points count (this is wrong but better than 0)
                file_processed_points = len(preview_points)
            
            file_preview = FilePreview(
                preview_points=preview_points,
                elevation_statistics=elevation_stats,
                spatial_coverage=spatial_coverage,
                data_quality=DataQuality(total_points=file_processed_points, classifications=[], return_types=None, gps_time_range=None, intensity_stats=None),
                file_metadata=FileMetadata(filename=filename, file_size_mb=0, las_version="Processed", point_data_format=0, creation_date=None, generating_software="Surface Generation API", system_identifier=None)
            )
            file_previews.append(file_preview)
        
        is_merge_job = job.processing_parameters.get("merge_outputs", False)
        
        # Use actual total processed points if available, otherwise fallback
        total_processed_points = job.total_processed_points
        if total_processed_points is None:
            # Fallback: sum preview points from all files (this is a sample count, not the actual total)
            total_processed_points = sum(len(points_data) for points_data in job.processed_preview_points.values())
        
        return MultiFilePreviewResponse(
            job_id=job.id,
            is_merge_job=is_merge_job,
            file_count=len(file_previews),
            file_previews=file_previews if not is_merge_job else [],
            merged_preview=file_previews[0] if is_merge_job and file_previews else None,  # Use first file as merged for simplicity
            processing_time_ms=0.0,
            total_processed_points=total_processed_points
        )