"""
MongoDB client for job management using Cosmos DB
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, ConnectionFailure

from app.config import settings
from app.models.job import Job, JobStatus
from app.utils.exceptions import StorageException, JobNotFoundException


logger = logging.getLogger(__name__)


class MongoJobClient:
    """MongoDB client for job operations"""
    
    def __init__(self):
        """Initialize MongoDB client"""
        try:
            self.client = AsyncIOMotorClient(settings.azure_mongo_connection_string)
            self.database = self.client[settings.azure_mongo_database_name]
            self.jobs_collection = self.database[settings.jobs_collection_name]
            logger.info(f"Initialized MongoDB client for database: {settings.azure_mongo_database_name}")
        except Exception as e:
            logger.error(f"Failed to initialize MongoDB client: {str(e)}")
            raise StorageException("mongo initialization", str(e))
    
    async def ensure_indexes(self):
        """Ensure required indexes exist"""
        try:
            # Create index for status queries
            await self.jobs_collection.create_index("status")
            
            # Create compound index for queued jobs (status + created_at)
            await self.jobs_collection.create_index([
                ("status", 1),
                ("created_at", 1)
            ])
            
            # Create compound index for completed jobs cleanup (status + completed_at)
            await self.jobs_collection.create_index([
                ("status", 1),
                ("completed_at", 1)
            ])
            
            # Create index for job listing (created_at descending)
            await self.jobs_collection.create_index([("created_at", -1)])
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Failed to create indexes: {str(e)}")
            # Don't raise exception as indexes might already exist
    
    async def create_job(self, job: Job) -> Job:
        """Create a new job"""
        try:
            # Convert to dict for MongoDB
            job_doc = job.dict()
            job_doc["_id"] = job.id  # Use job ID as MongoDB _id
            
            await self.jobs_collection.insert_one(job_doc)
            logger.info(f"Created job {job.id} in MongoDB")
            return job
            
        except DuplicateKeyError:
            logger.error(f"Job {job.id} already exists")
            raise StorageException("job creation", f"Job {job.id} already exists")
        except Exception as e:
            logger.error(f"Failed to create job: {str(e)}")
            raise StorageException("job creation", str(e))
    
    async def get_job(self, job_id: str) -> Job:
        """Get a job by ID"""
        try:
            job_doc = await self.jobs_collection.find_one({"_id": job_id})
            
            if not job_doc:
                raise JobNotFoundException(job_id)
            
            logger.info(f"Retrieved job document with input_files: {job_doc.get('input_files')}")
            
            # Remove MongoDB _id and convert back to Job
            job_doc.pop("_id", None)
            job = Job(**job_doc)
            
            logger.info(f"Converted Job model with input_files: {job.input_files}")
            return job
            
        except JobNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to get job {job_id}: {str(e)}")
            raise StorageException("job retrieval", str(e))
    
    async def update_job(self, job: Job) -> Job:
        """Update an existing job"""
        try:
            job.updated_at = datetime.utcnow()
            job_doc = job.dict()
            
            result = await self.jobs_collection.replace_one(
                {"_id": job.id},
                job_doc
            )
            
            if result.matched_count == 0:
                raise JobNotFoundException(job.id)
            
            logger.info(f"Updated job {job.id}")
            return job
            
        except JobNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to update job {job.id}: {str(e)}")
            raise StorageException("job update", str(e))
    
    async def get_queued_jobs(self, limit: int = 10) -> List[Job]:
        """Get queued jobs in FIFO order"""
        try:
            # Debug: Check what jobs exist with any status
            all_jobs_count = await self.jobs_collection.count_documents({})
            queued_count = await self.jobs_collection.count_documents({"status": JobStatus.QUEUED.value})
            logger.info(f"Total jobs in DB: {all_jobs_count}, Queued jobs count: {queued_count}")
            
            # If no queued jobs found, check what statuses exist
            if queued_count == 0:
                statuses = await self.jobs_collection.distinct("status")
                logger.info(f"Available job statuses: {statuses}")
            
            # Sort by _id which is always indexed and contains timestamp
            cursor = self.jobs_collection.find(
                {"status": JobStatus.QUEUED.value}
            ).sort("_id", 1).limit(limit)
            
            jobs = []
            async for job_doc in cursor:
                job_doc.pop("_id", None)
                jobs.append(Job(**job_doc))
            
            logger.info(f"Found {len(jobs)} queued jobs")
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to get queued jobs: Error={e}")
            return []
    
    async def get_old_completed_jobs(self, hours: int) -> List[Job]:
        """Get old jobs that should be cleaned up"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            logger.info(f"Cleanup query: Looking for jobs older than {cutoff_time} (cutoff: {hours} hours)")
            
            # First, let's see what jobs exist in general
            total_count = await self.jobs_collection.count_documents({})
            logger.info(f"Total jobs in database: {total_count}")
            
            # Check job statuses
            for status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.PROCESSING, JobStatus.QUEUED]:
                count = await self.jobs_collection.count_documents({"status": status.value})
                logger.info(f"Jobs with status '{status.value}': {count}")
            
            # Find jobs that should be cleaned up:
            # 1. Any job with DELETED status (old soft-deleted jobs that should be hard-deleted)
            # 2. Completed jobs older than cutoff (using completed_at if available, otherwise updated_at)
            # 3. Failed jobs older than cutoff (using updated_at)
            # 4. Any job older than cutoff based on created_at (fallback for jobs without proper timestamps)
            query = {
                "$or": [
                    # Clean up old soft-deleted jobs (these should have been hard-deleted)
                    {"status": JobStatus.DELETED.value},
                    # Old completed/failed jobs
                    {
                        "$and": [
                            {"status": {"$ne": JobStatus.DELETED.value}},  # Don't double-process deleted jobs
                            {
                                "$or": [
                                    # Completed jobs with completed_at timestamp
                                    {
                                        "status": JobStatus.COMPLETED.value,
                                        "completed_at": {"$exists": True, "$lt": cutoff_time}
                                    },
                                    # Failed jobs older than cutoff
                                    {
                                        "status": JobStatus.FAILED.value,
                                        "updated_at": {"$lt": cutoff_time}
                                    },
                                    # Completed jobs without completed_at (fallback to updated_at)
                                    {
                                        "status": JobStatus.COMPLETED.value,
                                        "completed_at": {"$exists": False},
                                        "updated_at": {"$lt": cutoff_time}
                                    },
                                    # Very old jobs based on creation time (safety net)
                                    {
                                        "created_at": {"$lt": cutoff_time}
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
            
            logger.info(f"Cleanup query: {query}")
            
            cursor = self.jobs_collection.find(query)
            
            jobs = []
            async for job_doc in cursor:
                logger.info(f"Found old job: {job_doc.get('_id')} - status: {job_doc.get('status')} - created: {job_doc.get('created_at')} - updated: {job_doc.get('updated_at')} - completed: {job_doc.get('completed_at')}")
                job_doc.pop("_id", None)
                jobs.append(Job(**job_doc))
            
            logger.info(f"Found {len(jobs)} old jobs to clean up (older than {hours} hours)")
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to get old jobs for cleanup: {str(e)}")
            return []
    
    async def mark_job_deleted(self, job_id: str) -> None:
        """Hard delete a job from MongoDB"""
        try:
            result = await self.jobs_collection.delete_one({"_id": job_id})
            if result.deleted_count > 0:
                logger.info(f"Hard deleted job {job_id} from MongoDB")
            else:
                logger.warning(f"Job {job_id} not found for deletion")
        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {str(e)}")
    
    async def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        limit: int = 20,
        days_back: int = 7
    ) -> List[Job]:
        """List jobs with filtering"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days_back)
            
            # Build query
            query = {"created_at": {"$gte": cutoff_time}}
            if status:
                query["status"] = status.value
            
            cursor = self.jobs_collection.find(query).sort("created_at", -1).limit(limit)
            
            jobs = []
            async for job_doc in cursor:
                job_doc.pop("_id", None)
                jobs.append(Job(**job_doc))
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to list jobs: {str(e)}")
            return []
    
    async def health_check(self) -> bool:
        """Check MongoDB connection"""
        try:
            # Simple ping to check connection
            await self.database.command("ping")
            return True
        except Exception as e:
            logger.error(f"MongoDB health check failed: {str(e)}")
            return False
    
    async def close(self):
        """Close MongoDB connection"""
        self.client.close()