"""
Job management service
"""

import logging
from typing import List, Optional
from datetime import datetime
import uuid

from app.models.job import Job, JobStatus
from app.models.processing import ProcessingParameters
from app.db.mongo_client import MongoJobClient
from app.services.storage import StorageService
from app.utils.exceptions import JobNotFoundException, StorageException


logger = logging.getLogger(__name__)


class JobManager:
    """Service for managing jobs"""
    
    def __init__(self):
        """Initialize job manager with MongoDB and storage clients"""
        self.mongo_client = MongoJobClient()
        self.storage_service = StorageService()
    
    async def create_job(
        self,
        input_files: List[str],
        processing_params: Optional[ProcessingParameters] = None
    ) -> Job:
        """
        Create a new job
        
        Args:
            input_files: List of input file blob names
            processing_params: Optional processing parameters
            
        Returns:
            Created job
        """
        return await self.create_job_with_id(
            str(uuid.uuid4()),
            input_files,
            processing_params
        )
    
    async def create_job_with_id(
        self,
        job_id: str,
        input_files: List[str],
        processing_params: Optional[ProcessingParameters] = None
    ) -> Job:
        """Create a new job with a specific ID."""
        try:
            job = Job(
                id=job_id,
                status=JobStatus.QUEUED,
                input_files=input_files,
                processing_parameters=processing_params.dict() if processing_params else {},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            await self.mongo_client.create_job(job)
            logger.info(f"Created job {job.id} with {len(input_files)} input files")
            return job

        except Exception as e:
            logger.error(f"Failed to create job: {str(e)}")
            raise StorageException("job creation", str(e))
    
    async def get_job(self, job_id: str) -> Job:
        """
        Get a job by ID
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job model
            
        Raises:
            JobNotFoundException: If job not found
        """
        return await self.mongo_client.get_job(job_id)
    
    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        error_message: Optional[str] = None,
        output_files: Optional[List[str]] = None,
        total_processed_points: Optional[int] = None
    ) -> Job:
        """
        Update job status
        
        Args:
            job_id: Job identifier
            status: New status
            error_message: Optional error message
            output_files: Optional list of output files
            total_processed_points: Optional total number of processed points
            
        Returns:
            Updated job
        """
        try:
            # Get current job
            job = await self.get_job(job_id)
            
            # Update fields
            job.status = status
            job.updated_at = datetime.utcnow()
            
            if error_message is not None:
                job.error_message = error_message
            
            if output_files is not None:
                job.output_files = output_files
            
            if total_processed_points is not None:
                job.total_processed_points = total_processed_points
            
            if status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                job.completed_at = datetime.utcnow()
            
            # Save updates
            await self.mongo_client.update_job(job)
            
            logger.info(f"Updated job {job_id} status to {status.value}")
            return job
            
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {str(e)}")
            raise
    
    async def get_queued_jobs(self, limit: int = 10) -> List[Job]:
        """
        Get queued jobs for processing
        
        Args:
            limit: Maximum number of jobs to return
            
        Returns:
            List of queued jobs
        """
        return await self.mongo_client.get_queued_jobs(limit)
    
    async def get_old_completed_jobs(self, hours: int) -> List[Job]:
        """
        Get completed jobs older than specified hours
        
        Args:
            hours: Age threshold in hours
            
        Returns:
            List of old completed jobs
        """
        return await self.mongo_client.get_old_completed_jobs(hours)
    
    async def delete_job_files(self, job: Job) -> None:
        """
        Delete all files associated with a job
        
        Args:
            job: Job model
        """
        try:
            # Delete all files from blob storage
            await self.storage_service.delete_job_files(job.id)
            
            # Hard delete job from MongoDB
            await self.mongo_client.delete_job(job.id)
            
            logger.info(f"Hard deleted job {job.id} and all associated files")
            
        except Exception as e:
            logger.error(f"Failed to delete files for job {job.id}: {str(e)}")
    
    
    async def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        limit: int = 20,
        days_back: int = 7
    ) -> List[Job]:
        """
        List jobs with optional filtering
        
        Args:
            status: Filter by job status
            limit: Maximum number of jobs
            days_back: How many days back to search
            
        Returns:
            List of jobs
        """
        return await self.mongo_client.list_jobs(status, limit, days_back)
    
    async def get_job_progress(self, job_id: str) -> float:
        """
        Get job progress percentage
        
        Args:
            job_id: Job identifier
            
        Returns:
            Progress percentage (0-100)
        """
        try:
            job = await self.get_job(job_id)
            
            if job.status == JobStatus.QUEUED:
                return 0.0
            elif job.status == JobStatus.PROCESSING:
                # Estimate based on typical processing time
                # In real implementation, this could check actual progress
                return 50.0
            elif job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                return 100.0
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Failed to get progress for job {job_id}: {str(e)}")
            return 0.0
    
    async def cancel_job(self, job_id: str) -> Job:
        """
        Cancel a job and clean up its files
        
        Args:
            job_id: Job identifier
            
        Returns:
            Updated job
        """
        try:
            job = await self.get_job(job_id)
            
            # Only cancel if job is queued or processing
            if job.status not in [JobStatus.QUEUED, JobStatus.PROCESSING]:
                raise ValueError(f"Cannot cancel job in {job.status.value} status")
            
            # Update status to failed with cancellation message
            updated = await self.update_job_status(
                job_id,
                JobStatus.FAILED,
                error_message="Job cancelled by user"
            )
            
            # Clean up uploaded files
            try:
                await self.storage_service.delete_job_files(job_id)
            except Exception as e:
                logger.warning(f"Failed to clean up files for cancelled job {job_id}: {e}")
            
            return updated
            
        except (ValueError, JobNotFoundException):
            raise
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {str(e)}")
            raise