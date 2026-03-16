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
            # All input files are stored as full blob paths: jobs/job_id/input/filename.las
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
            error_message="",
            output_files=[],
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
    Get preview data for a job.

    For completed jobs, reads the lightweight preview CSV generated during
    processing (no LAS parsing required).  For in-progress/queued jobs,
    falls back to live preview generation from the raw LAS file.
    """
    try:
        job_manager = JobManager()
        job = await job_manager.get_job(job_id)

        if not job.input_files:
            raise HTTPException(status_code=400, detail="Job has no input files")

        # Completed jobs: serve from preview CSV in blob storage
        if job.status == JobStatus.COMPLETED and job.output_files:
            preview_service = PreviewService()
            return await preview_service.build_preview_from_outputs(job)

        # Non-completed jobs: live preview from raw LAS
        preview_service = PreviewService()

        if len(job.input_files) == 1:
            return await preview_service.generate_preview(job_id, job.input_files[0])
        else:
            is_merge_job = job.processing_parameters.get("merge_outputs", False)
            return await preview_service.generate_multi_file_preview(
                job_id, job.input_files, is_merge_job
            )

    except JobNotFoundException as e:
        raise e
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job preview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")