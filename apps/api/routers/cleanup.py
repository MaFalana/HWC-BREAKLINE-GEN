"""
Cleanup management router
"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.services.cleanup import CleanupService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cleanup", tags=["cleanup"])

# Create cleanup service instance for this router
cleanup_service = CleanupService()


class CleanupResponse(BaseModel):
    """Cleanup operation response"""
    success: bool
    message: str
    cleaned_jobs: int


@router.post("/force", response_model=CleanupResponse)
async def force_cleanup():
    """
    Force immediate cleanup of old files and jobs
    
    Triggers an immediate cleanup run regardless of the scheduled interval.
    This will delete all files and mark old jobs as deleted.
    
    Returns:
        Number of jobs cleaned up
    """
    try:
        logger.info("Manual cleanup requested via API")
        
        # Run forced cleanup
        cleaned_jobs = await cleanup_service.force_cleanup()
        
        return CleanupResponse(
            success=True,
            message=f"Cleanup completed successfully. Cleaned up {cleaned_jobs} jobs.",
            cleaned_jobs=cleaned_jobs
        )
        
    except Exception as e:
        logger.error(f"Failed to force cleanup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run cleanup: {str(e)}"
        )


@router.get("/status")
async def get_cleanup_status():
    """
    Get cleanup service status
    
    Returns current status of the cleanup service including:
    - Whether the service is running
    - File retention period in hours
    - Cleanup interval in seconds
    - Next scheduled cleanup time (if running)
    """
    try:
        status_data = cleanup_service.get_status()
        return status_data
        
    except Exception as e:
        logger.error(f"Failed to get cleanup status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cleanup service status"
        )


@router.get("/orphaned")
async def find_orphaned_files():
    """
    Find orphaned job folders in storage containers that don't have corresponding jobs in database
    """
    try:
        from app.db.mongo_client import MongoJobClient
        from azure.storage.blob import BlobServiceClient
        
        mongo_client = MongoJobClient()
        
        # Get all job IDs from database
        db_job_ids = set()
        async for job_doc in mongo_client.jobs_collection.find({}, {"_id": 1}):
            db_job_ids.add(job_doc["_id"])
        
        logger.info(f"Found {len(db_job_ids)} jobs in database")
        
        # Check both containers for job folders
        blob_service_client = BlobServiceClient.from_connection_string(settings.azure_connection_string)
        containers_to_check = ["lidar-to-civil", "lidar-to-civil-dev"]
        
        orphaned_folders = {}
        
        for container_name in containers_to_check:
            try:
                container_client = blob_service_client.get_container_client(container_name)
                
                # Check if container exists
                try:
                    container_client.get_container_properties()
                except:
                    logger.info(f"Container {container_name} does not exist, skipping")
                    continue
                
                # Find all unique job IDs in this container
                storage_job_ids = set()
                prefixes = ["uploads/", "outputs/"]
                
                for prefix in prefixes:
                    blobs = container_client.list_blobs(name_starts_with=prefix)
                    for blob in blobs:
                        # Extract job ID from path like "uploads/job-id/file" or "outputs/job-id/file"
                        path_parts = blob.name.split('/')
                        if len(path_parts) >= 2:
                            job_id = path_parts[1]
                            storage_job_ids.add(job_id)
                
                # Find orphaned job IDs (in storage but not in database)
                orphaned_in_container = storage_job_ids - db_job_ids
                
                orphaned_folders[container_name] = {
                    "total_job_folders": len(storage_job_ids),
                    "orphaned_count": len(orphaned_in_container),
                    "orphaned_job_ids": list(orphaned_in_container)[:10]  # Show first 10
                }
                
                logger.info(f"Container {container_name}: {len(storage_job_ids)} job folders, {len(orphaned_in_container)} orphaned")
                
            except Exception as container_error:
                logger.error(f"Error checking container {container_name}: {str(container_error)}")
                orphaned_folders[container_name] = {"error": str(container_error)}
        
        return {
            "database_jobs": len(db_job_ids),
            "containers": orphaned_folders,
            "note": "Use POST /cleanup/orphaned to clean up orphaned folders"
        }
        
    except Exception as e:
        logger.error(f"Failed to find orphaned files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find orphaned files: {str(e)}"
        )


@router.post("/orphaned")
async def cleanup_orphaned_files():
    """
    Clean up orphaned job folders that don't have corresponding jobs in database
    """
    try:
        from app.db.mongo_client import MongoJobClient
        from azure.storage.blob import BlobServiceClient
        
        mongo_client = MongoJobClient()
        
        # Get all job IDs from database
        db_job_ids = set()
        async for job_doc in mongo_client.jobs_collection.find({}, {"_id": 1}):
            db_job_ids.add(job_doc["_id"])
        
        logger.info(f"Found {len(db_job_ids)} jobs in database")
        
        # Check both containers and clean up orphaned folders
        blob_service_client = BlobServiceClient.from_connection_string(settings.azure_connection_string)
        containers_to_check = ["lidar-to-civil", "lidar-to-civil-dev"]
        
        total_deleted_files = 0
        cleanup_summary = {}
        
        for container_name in containers_to_check:
            try:
                container_client = blob_service_client.get_container_client(container_name)
                
                # Check if container exists
                try:
                    container_client.get_container_properties()
                except:
                    logger.info(f"Container {container_name} does not exist, skipping")
                    continue
                
                # Find and delete orphaned files
                orphaned_job_ids = set()
                deleted_files = 0
                prefixes = ["uploads/", "outputs/"]
                
                for prefix in prefixes:
                    blobs = container_client.list_blobs(name_starts_with=prefix)
                    for blob in blobs:
                        # Extract job ID from path
                        path_parts = blob.name.split('/')
                        if len(path_parts) >= 2:
                            job_id = path_parts[1]
                            
                            # If job ID not in database, it's orphaned - delete the file
                            if job_id not in db_job_ids:
                                orphaned_job_ids.add(job_id)
                                try:
                                    blob_client = container_client.get_blob_client(blob.name)
                                    await blob_client.delete_blob()
                                    deleted_files += 1
                                    logger.debug(f"Deleted orphaned file: {blob.name}")
                                except Exception as blob_error:
                                    logger.error(f"Failed to delete {blob.name}: {str(blob_error)}")
                
                total_deleted_files += deleted_files
                cleanup_summary[container_name] = {
                    "orphaned_job_folders": len(orphaned_job_ids),
                    "deleted_files": deleted_files
                }
                
                logger.info(f"Container {container_name}: Deleted {deleted_files} files from {len(orphaned_job_ids)} orphaned job folders")
                
            except Exception as container_error:
                logger.error(f"Error cleaning container {container_name}: {str(container_error)}")
                cleanup_summary[container_name] = {"error": str(container_error)}
        
        return CleanupResponse(
            success=True,
            message=f"Orphaned cleanup completed. Deleted {total_deleted_files} orphaned files across containers.",
            cleaned_jobs=sum(c.get("orphaned_job_folders", 0) for c in cleanup_summary.values() if "error" not in c)
        )
        
    except Exception as e:
        logger.error(f"Failed to cleanup orphaned files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup orphaned files: {str(e)}"
        )


@router.get("/debug")
async def debug_cleanup():
    """
    Debug endpoint to see what jobs exist in database
    """
    try:
        from app.db.mongo_client import MongoJobClient
        from app.models.job import JobStatus
        
        mongo_client = MongoJobClient()
        
        # Get basic stats
        total_count = await mongo_client.jobs_collection.count_documents({})
        deleted_count = await mongo_client.jobs_collection.count_documents({"status": "deleted"})
        completed_count = await mongo_client.jobs_collection.count_documents({"status": "completed"})
        
        # Get a sample of deleted jobs
        deleted_jobs_sample = []
        async for job_doc in mongo_client.jobs_collection.find({"status": "deleted"}).limit(3):
            deleted_jobs_sample.append({
                "id": job_doc.get("_id"),
                "status": job_doc.get("status"),
                "created_at": job_doc.get("created_at"),
                "updated_at": job_doc.get("updated_at"),
                "completed_at": job_doc.get("completed_at")
            })
        
        return {
            "total_jobs": total_count,
            "deleted_jobs": deleted_count,
            "completed_jobs": completed_count,
            "deleted_sample": deleted_jobs_sample
        }
        
    except Exception as e:
        logger.error(f"Failed to debug cleanup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to debug cleanup: {str(e)}"
        )