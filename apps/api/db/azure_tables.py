"""
Azure Tables client wrapper for job management
"""

import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from azure.data.tables import TableServiceClient, TableClient
from azure.core.exceptions import ResourceNotFoundError, ResourceExistsError

from app.config import settings
from app.models.job import Job, JobEntity, JobStatus
from app.utils.exceptions import StorageException, JobNotFoundException


logger = logging.getLogger(__name__)


class AzureTablesClient:
    """Client for Azure Tables operations"""
    
    def __init__(self):
        """Initialize Azure Tables client"""
        try:
            self.service_client = TableServiceClient.from_connection_string(
                settings.azure_connection_string
            )
            self.table_client = self.service_client.get_table_client(
                table_name=settings.table_name
            )
            # Ensure table exists
            self._ensure_table_exists()
        except Exception as e:
            logger.error(f"Failed to initialize Azure Tables client: {str(e)}")
            raise StorageException("initialization", str(e))
    
    def _ensure_table_exists(self) -> None:
        """Create table if it doesn't exist"""
        try:
            self.service_client.create_table_if_not_exists(settings.table_name)
            logger.info(f"Ensured table '{settings.table_name}' exists")
        except Exception as e:
            logger.error(f"Failed to create table: {str(e)}")
            raise StorageException("table creation", str(e))
    
    async def create_job(self, job: Job) -> Job:
        """
        Create a new job in Azure Tables
        
        Args:
            job: Job model to create
            
        Returns:
            Created job
            
        Raises:
            StorageException: If creation fails
        """
        try:
            entity = JobEntity.from_job(job)
            entity_dict = entity.dict()
            
            # Convert datetime objects to ISO strings for Azure Tables
            for key, value in entity_dict.items():
                if isinstance(value, datetime):
                    entity_dict[key] = value.isoformat()
            
            self.table_client.create_entity(entity_dict)
            logger.info(f"Created job {job.id} in Azure Tables")
            return job
            
        except ResourceExistsError:
            logger.error(f"Job {job.id} already exists")
            raise StorageException("job creation", f"Job {job.id} already exists")
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
            StorageException: If retrieval fails
        """
        try:
            # Try multiple partitions (last 7 days)
            for days_ago in range(7):
                partition_key = (datetime.utcnow() - timedelta(days=days_ago)).strftime("%Y%m%d")
                try:
                    entity = self.table_client.get_entity(
                        partition_key=partition_key,
                        row_key=job_id
                    )
                    # Convert ISO strings back to datetime
                    for key in ["CreatedAt", "UpdatedAt", "CompletedAt"]:
                        if key in entity and entity[key]:
                            entity[key] = datetime.fromisoformat(entity[key].replace("Z", "+00:00"))
                    
                    job_entity = JobEntity(**entity)
                    return job_entity.to_job()
                except ResourceNotFoundError:
                    continue
            
            raise JobNotFoundException(job_id)
            
        except JobNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to get job {job_id}: {str(e)}")
            raise StorageException("job retrieval", str(e))
    
    async def update_job(self, job: Job) -> Job:
        """
        Update an existing job
        
        Args:
            job: Job model with updates
            
        Returns:
            Updated job
            
        Raises:
            StorageException: If update fails
        """
        try:
            job.updated_at = datetime.utcnow()
            entity = JobEntity.from_job(job)
            entity_dict = entity.dict()
            
            # Convert datetime objects to ISO strings
            for key, value in entity_dict.items():
                if isinstance(value, datetime):
                    entity_dict[key] = value.isoformat()
            
            self.table_client.update_entity(entity_dict, mode="replace")
            logger.info(f"Updated job {job.id}")
            return job
            
        except ResourceNotFoundError:
            raise JobNotFoundException(job.id)
        except Exception as e:
            logger.error(f"Failed to update job {job.id}: {str(e)}")
            raise StorageException("job update", str(e))
    
    async def get_queued_jobs(self, limit: int = 10) -> List[Job]:
        """
        Get queued jobs for processing
        
        Args:
            limit: Maximum number of jobs to return
            
        Returns:
            List of queued jobs
        """
        try:
            # Query for queued jobs from recent partitions
            jobs = []
            for days_ago in range(3):  # Check last 3 days
                partition_key = (datetime.utcnow() - timedelta(days=days_ago)).strftime("%Y%m%d")
                
                query_filter = f"PartitionKey eq '{partition_key}' and Status eq '{JobStatus.QUEUED.value}'"
                entities = self.table_client.query_entities(
                    query_filter=query_filter,
                    select=["PartitionKey", "RowKey", "Status", "InputFiles", "OutputFiles", 
                           "ProcessingParameters", "CreatedAt", "UpdatedAt", "CompletedAt", "ErrorMessage"]
                )
                
                for entity in entities:
                    if len(jobs) >= limit:
                        break
                    
                    # Convert ISO strings back to datetime
                    for key in ["CreatedAt", "UpdatedAt", "CompletedAt"]:
                        if key in entity and entity[key]:
                            entity[key] = datetime.fromisoformat(entity[key].replace("Z", "+00:00"))
                    
                    job_entity = JobEntity(**entity)
                    jobs.append(job_entity.to_job())
                
                if len(jobs) >= limit:
                    break
            
            logger.info(f"Found {len(jobs)} queued jobs")
            return jobs[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get queued jobs: {str(e)}")
            return []
    
    async def get_old_completed_jobs(self, hours: int) -> List[Job]:
        """
        Get completed jobs older than specified hours
        
        Args:
            hours: Age threshold in hours
            
        Returns:
            List of old completed jobs
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            jobs = []
            
            # Check partitions from cutoff date onwards
            days_to_check = hours // 24 + 2  # Add buffer
            for days_ago in range(days_to_check):
                partition_key = (datetime.utcnow() - timedelta(days=days_ago)).strftime("%Y%m%d")
                
                query_filter = f"PartitionKey eq '{partition_key}' and Status eq '{JobStatus.COMPLETED.value}'"
                entities = self.table_client.query_entities(query_filter=query_filter)
                
                for entity in entities:
                    # Convert ISO strings back to datetime
                    for key in ["CreatedAt", "UpdatedAt", "CompletedAt"]:
                        if key in entity and entity[key]:
                            entity[key] = datetime.fromisoformat(entity[key].replace("Z", "+00:00"))
                    
                    job_entity = JobEntity(**entity)
                    job = job_entity.to_job()
                    
                    # Check if job is old enough
                    if job.completed_at and job.completed_at < cutoff_time:
                        jobs.append(job)
            
            logger.info(f"Found {len(jobs)} completed jobs older than {hours} hours")
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to get old completed jobs: {str(e)}")
            return []
    
    async def mark_job_deleted(self, job_id: str) -> None:
        """
        Mark a job as deleted
        
        Args:
            job_id: Job identifier
        """
        try:
            job = await self.get_job(job_id)
            job.status = JobStatus.DELETED
            job.updated_at = datetime.utcnow()
            await self.update_job(job)
            logger.info(f"Marked job {job_id} as deleted")
            
        except Exception as e:
            logger.error(f"Failed to mark job {job_id} as deleted: {str(e)}")
    
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
            limit: Maximum number of jobs to return
            days_back: How many days back to search
            
        Returns:
            List of jobs
        """
        try:
            jobs = []
            
            for days_ago in range(days_back):
                if len(jobs) >= limit:
                    break
                    
                partition_key = (datetime.utcnow() - timedelta(days=days_ago)).strftime("%Y%m%d")
                
                if status:
                    query_filter = f"PartitionKey eq '{partition_key}' and Status eq '{status.value}'"
                else:
                    query_filter = f"PartitionKey eq '{partition_key}'"
                
                entities = self.table_client.query_entities(query_filter=query_filter)
                
                for entity in entities:
                    if len(jobs) >= limit:
                        break
                    
                    # Convert ISO strings back to datetime
                    for key in ["CreatedAt", "UpdatedAt", "CompletedAt"]:
                        if key in entity and entity[key]:
                            entity[key] = datetime.fromisoformat(entity[key].replace("Z", "+00:00"))
                    
                    job_entity = JobEntity(**entity)
                    jobs.append(job_entity.to_job())
            
            # Sort by created_at descending
            jobs.sort(key=lambda x: x.created_at, reverse=True)
            return jobs[:limit]
            
        except Exception as e:
            logger.error(f"Failed to list jobs: {str(e)}")
            return []
    
    async def health_check(self) -> bool:
        """
        Check if Azure Tables is accessible
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            # Try to query the table
            query = f"PartitionKey eq 'health_check'"
            list(self.table_client.query_entities(query_filter=query, max_results=1))
            return True
        except Exception as e:
            logger.error(f"Azure Tables health check failed: {str(e)}")
            return False