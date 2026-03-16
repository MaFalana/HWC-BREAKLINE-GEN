"""
File download endpoints
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from app.models.responses import DownloadResponse
from app.models.job import JobStatus
from app.services.job_manager import JobManager
from app.services.storage import StorageService
from app.utils.exceptions import JobNotFoundException, JobNotCompletedException


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/download", tags=["Download"])


@router.get(
    "/{job_id}",
    response_model=DownloadResponse,
    summary="Get download URLs",
    description="Get download URLs for completed job outputs"
)
async def get_download_urls(
    job_id: str,
    expiry_hours: int = 1
):
    """
    Get download URLs for job output files
    
    URLs are valid for the specified number of hours (default: 1 hour)
    """
    try:
        job_manager = JobManager()
        storage_service = StorageService()
        
        # Get job
        job = await job_manager.get_job(job_id)
        
        # Check if job is completed
        if job.status != JobStatus.COMPLETED:
            raise JobNotCompletedException(job_id, job.status.value)
        
        # Check if job has output files
        if not job.output_files:
            raise HTTPException(
                status_code=404,
                detail="No output files found for this job"
            )
        
        # Filter out internal preview CSVs — they're not user-facing outputs
        user_outputs = [f for f in job.output_files if not f.endswith("_preview.csv")]

        # Generate download URLs
        download_urls = storage_service.generate_download_urls(
            user_outputs,
            expiry_hours
        )
        
        # Calculate expiry time
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(hours=expiry_hours)
        
        return DownloadResponse(
            job_id=job_id,
            download_urls=download_urls,
            expires_at=expires_at
        )
        
    except (JobNotFoundException, JobNotCompletedException) as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to generate download URLs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate download URLs")


@router.get(
    "/{job_id}/{filename}",
    summary="Download a specific file",
    description="Download a specific output file directly"
)
async def download_file(
    job_id: str,
    filename: str
):
    """
    Download a specific file by redirecting to a signed URL
    """
    try:
        job_manager = JobManager()
        storage_service = StorageService()
        
        # Get job
        job = await job_manager.get_job(job_id)
        
        # Check if job is completed
        if job.status != JobStatus.COMPLETED:
            raise JobNotCompletedException(job_id, job.status.value)
        
        # Find the file in output files
        matching_blob = None
        for blob_name in job.output_files:
            if blob_name.endswith(filename):
                matching_blob = blob_name
                break
        
        if not matching_blob:
            raise HTTPException(
                status_code=404,
                detail=f"File '{filename}' not found in job outputs"
            )
        
        # Generate download URL
        download_url = storage_service.generate_download_url(
            matching_blob,
            expiry_hours=1,
            filename=filename
        )
        
        # Redirect to the download URL
        return RedirectResponse(url=download_url)
        
    except (JobNotFoundException, JobNotCompletedException) as e:
        raise e
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download file")


@router.get(
    "/{job_id}/all",
    summary="Download all files as ZIP",
    description="Download all output files as a ZIP archive (not implemented)"
)
async def download_all_files(job_id: str):
    """
    Download all output files as a ZIP archive
    
    Note: This endpoint is not yet implemented
    """
    raise HTTPException(
        status_code=501,
        detail="ZIP download not yet implemented. Please download files individually."
    )