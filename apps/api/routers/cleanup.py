"""
Cleanup management router
"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.cleanup import CleanupService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cleanup", tags=["Cleanup"])

cleanup_service = CleanupService()


class CleanupResponse(BaseModel):
    success: bool
    message: str
    cleaned_jobs: int


@router.post("/force", response_model=CleanupResponse)
async def force_cleanup():
    """Force immediate cleanup of old files and jobs."""
    try:
        cleaned_jobs = await cleanup_service.force_cleanup()
        return CleanupResponse(
            success=True,
            message=f"Cleaned up {cleaned_jobs} jobs.",
            cleaned_jobs=cleaned_jobs,
        )
    except Exception as e:
        logger.error(f"Failed to force cleanup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run cleanup: {str(e)}",
        )


@router.get("/status")
async def get_cleanup_status():
    """Get cleanup service status."""
    try:
        return cleanup_service.get_status()
    except Exception as e:
        logger.error(f"Failed to get cleanup status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cleanup service status",
        )
