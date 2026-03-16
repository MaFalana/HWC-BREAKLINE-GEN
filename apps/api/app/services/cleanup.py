"""
File cleanup service for automatic deletion
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from app.config import settings
from app.services.job_manager import JobManager


logger = logging.getLogger(__name__)


class CleanupService:
    """Service for cleaning up old files"""

    def __init__(self):
        self.job_manager = JobManager()
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._cleanup_loop())
        logger.info("Started cleanup service")

    async def stop(self) -> None:
        if not self.is_running:
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
        while self.is_running:
            try:
                await self._run_cleanup()
                await asyncio.sleep(settings.cleanup_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {str(e)}")
                await asyncio.sleep(60)

    async def _run_cleanup(self) -> int:
        """Delete files and jobs older than retention period. Returns count cleaned."""
        try:
            old_jobs = await self.job_manager.get_old_completed_jobs(
                settings.file_retention_hours
            )
            if not old_jobs:
                logger.info("No old jobs to clean up")
                return 0

            logger.info(f"Found {len(old_jobs)} old jobs to clean up")
            cleanup_count = 0
            for job in old_jobs:
                try:
                    await self.job_manager.delete_job_files(job)
                    cleanup_count += 1
                except Exception as e:
                    logger.error(f"Failed to clean up job {job.id}: {str(e)}")

            logger.info(f"Cleanup completed: {cleanup_count} jobs removed")
            return cleanup_count
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return 0

    async def force_cleanup(self) -> int:
        """Force an immediate cleanup run."""
        logger.info("Forcing immediate cleanup")
        return await self._run_cleanup()

    def get_status(self) -> dict:
        return {
            "is_running": self.is_running,
            "retention_hours": settings.file_retention_hours,
            "cleanup_interval_seconds": settings.cleanup_interval_seconds,
            "next_cleanup": (
                (datetime.utcnow() + timedelta(seconds=settings.cleanup_interval_seconds)).isoformat()
                if self.is_running else None
            ),
        }
