"""
File cleanup service for automatic deletion
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from app.config import settings
from app.services.job_manager import JobManager
from app.models.job import JobStatus


logger = logging.getLogger(__name__)


class CleanupService:
    """Service for cleaning up old files"""
    
    def __init__(self):
        """Initialize cleanup service"""
        self.job_manager = JobManager()
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self) -> None:
        """Start the cleanup service"""
        if self.is_running:
            logger.warning("Cleanup service is already running")
            return
        
        self.is_running = True
        self._task = asyncio.create_task(self._cleanup_loop())
        logger.info("Started cleanup service")
    
    async def stop(self) -> None:
        """Stop the cleanup service"""
        if not self.is_running:
            logger.warning("Cleanup service is not running")
            return
        
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        logger.info("Stopped cleanup service")
    
    async def _cleanup_loop(self) -> None:
        """Main cleanup loop"""
        while self.is_running:
            try:
                await self._cleanup_old_files()
                
                # Wait for next cleanup interval
                await asyncio.sleep(settings.cleanup_interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {str(e)}")
                # Wait a bit before retrying
                await asyncio.sleep(60)
    
    async def _cleanup_old_files(self) -> None:
        """Clean up files older than retention period"""
        try:
            logger.info(f"Starting cleanup for files older than {settings.file_retention_hours} hours")
            
            # Get old completed jobs
            old_jobs = await self.job_manager.get_old_completed_jobs(
                settings.file_retention_hours
            )
            
            if not old_jobs:
                logger.info("No old jobs to clean up")
                return
            
            logger.info(f"Found {len(old_jobs)} old jobs to clean up")
            
            # Delete files for each job
            cleanup_count = 0
            for job in old_jobs:
                try:
                    if job.status == JobStatus.DELETED:
                        # This is an old soft-deleted job - hard delete it from MongoDB only
                        # (files should already be deleted when it was soft-deleted)
                        await self.job_manager.mongo_client.mark_job_deleted(job.id)
                        cleanup_count += 1
                        logger.info(f"Hard deleted old soft-deleted job {job.id}")
                    else:
                        # This is an old active job - delete files and hard delete from MongoDB
                        # Use cross-container cleanup to ensure files are deleted from both containers
                        await self.job_manager.delete_job_files_cross_container(job)
                        cleanup_count += 1
                        logger.info(f"Cleaned up files for job {job.id} across containers")
                    
                except Exception as e:
                    logger.error(f"Failed to clean up job {job.id}: {str(e)}")
            
            logger.info(f"Cleanup completed. Cleaned up {cleanup_count} jobs")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
    
    async def force_cleanup(self) -> int:
        """
        Force an immediate cleanup run
        
        Returns:
            Number of jobs cleaned up
        """
        logger.info("Forcing immediate cleanup")
        
        try:
            old_jobs = await self.job_manager.get_old_completed_jobs(
                settings.file_retention_hours
            )
            
            cleanup_count = 0
            for job in old_jobs:
                try:
                    if job.status == JobStatus.DELETED:
                        # This is an old soft-deleted job - hard delete it from MongoDB only
                        await self.job_manager.mongo_client.mark_job_deleted(job.id)
                        cleanup_count += 1
                        logger.info(f"Hard deleted old soft-deleted job {job.id}")
                    else:
                        # This is an old active job - delete files and hard delete from MongoDB
                        # Use cross-container cleanup to ensure files are deleted from both containers
                        await self.job_manager.delete_job_files_cross_container(job)
                        cleanup_count += 1
                        logger.info(f"Cleaned up files for job {job.id} across containers")
                except Exception as e:
                    logger.error(f"Failed to clean up job {job.id}: {str(e)}")
            
            return cleanup_count
            
        except Exception as e:
            logger.error(f"Error during forced cleanup: {str(e)}")
            return 0
    
    def get_status(self) -> dict:
        """
        Get cleanup service status
        
        Returns:
            Status dictionary
        """
        return {
            "is_running": self.is_running,
            "retention_hours": settings.file_retention_hours,
            "cleanup_interval_seconds": settings.cleanup_interval_seconds,
            "next_cleanup": (
                (datetime.utcnow() + timedelta(seconds=settings.cleanup_interval_seconds)).isoformat()
                if self.is_running else None
            )
        }