"""
Surface Generation API - Main Application
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import upload_router, jobs_router, download_router, health_router, cleanup_router
from app.services.cleanup import CleanupService
from app.services.processor import ProcessorService
from app.services.job_manager import JobManager
from app.db.mongo_client import MongoJobClient
from app.models.job import JobStatus
from app.utils.exceptions import BaseAPIException


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Global services
cleanup_service = CleanupService()
job_processing_task = None


async def process_jobs_loop():
    """Background task to process queued jobs"""
    job_manager = JobManager()
    processor_service = ProcessorService()
    
    while True:
        try:
            # Get queued jobs
            queued_jobs = await job_manager.get_queued_jobs(limit=1)
            
            for job in queued_jobs:
                # Check if job is old enough to process (avoid Azure consistency issues)
                from datetime import datetime, timedelta
                job_age = datetime.utcnow() - job.created_at
                min_age = timedelta(seconds=10)  # Wait at least 10 seconds after job creation
                
                if job_age < min_age:
                    logger.info(f"Job {job.id} is too recent ({job_age.total_seconds():.1f}s old), waiting for Azure consistency...")
                    continue  # Skip this job for now, will be picked up in the next loop iteration
                
                logger.info(f"Processing job {job.id} (created {job_age.total_seconds():.1f}s ago)")
                
                try:
                    # Re-check status — job may have been cancelled while queued
                    fresh_job = await job_manager.get_job(job.id)
                    if fresh_job.status != JobStatus.QUEUED:
                        logger.info(f"Job {job.id} is no longer queued (status: {fresh_job.status.value}), skipping")
                        continue
                    
                    # Skip jobs with no input files
                    if not job.input_files:
                        logger.warning(f"Job {job.id} has no input files, marking as failed")
                        await job_manager.update_job_status(
                            job.id,
                            JobStatus.FAILED,
                            error_message="No input files found"
                        )
                        continue
                    
                    # Update status to processing
                    await job_manager.update_job_status(
                        job.id,
                        JobStatus.PROCESSING
                    )
                    
                    # Process the job
                    output_files, total_processed_points = await processor_service.process_job(
                        job.id,
                        job.input_files,
                        job.processing_parameters
                    )
                    
                    # Re-check status — job may have been cancelled during processing
                    current_job = await job_manager.get_job(job.id)
                    if current_job.status == JobStatus.FAILED:
                        logger.info(f"Job {job.id} was cancelled during processing, skipping completion")
                        continue
                    
                    # Update status to completed
                    await job_manager.update_job_status(
                        job.id,
                        JobStatus.COMPLETED,
                        output_files=output_files,
                        total_processed_points=total_processed_points
                    )
                    
                    logger.info(f"Successfully processed job {job.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to process job {job.id}: {str(e)}")
                    
                    # Update status to failed
                    await job_manager.update_job_status(
                        job.id,
                        JobStatus.FAILED,
                        error_message=str(e)
                    )
            
            # Wait before checking again
            await asyncio.sleep(settings.job_processing_interval_seconds)
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in job processing loop: {str(e)}")
            await asyncio.sleep(30)  # Wait before retrying


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global job_processing_task
    
    # Startup
    logger.info("Starting Surface Generation API")
    
    # Initialize database indexes
    try:
        mongo_client = MongoJobClient()
        await mongo_client.ensure_indexes()
        await mongo_client.close()
        logger.info("Database indexes initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize database indexes: {e}")
    
    # Start cleanup service
    await cleanup_service.start()
    logger.info("Started cleanup service")
    
    # Start job processing task
    job_processing_task = asyncio.create_task(process_jobs_loop())
    logger.info("Started job processing task")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Surface Generation API")
    
    # Stop cleanup service
    await cleanup_service.stop()
    logger.info("Stopped cleanup service")
    
    # Stop job processing task
    if job_processing_task:
        job_processing_task.cancel()
        try:
            await job_processing_task
        except asyncio.CancelledError:
            pass
    logger.info("Stopped job processing task")


# Create FastAPI application
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="API for processing LiDAR point cloud files and generating surface breaklines",
    lifespan=lifespan
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(BaseAPIException)
async def handle_api_exception(request: Request, exc: BaseAPIException):
    """Handle custom API exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )


# Include routers
app.include_router(upload_router, prefix=settings.api_prefix)
app.include_router(jobs_router, prefix=settings.api_prefix)
app.include_router(download_router, prefix=settings.api_prefix)
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(cleanup_router, prefix=settings.api_prefix)


# Root endpoint
@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint"""
    return {
        "message": "Surface Generation API",
        "version": settings.api_version,
        "documentation": "/docs"
    }


# API documentation redirect
@app.get("/api", include_in_schema=False)
async def api_root():
    """API root redirect to documentation"""
    return {
        "message": "Surface Generation API",
        "version": settings.api_version,
        "documentation": "/docs",
        "endpoints": {
            "upload": f"{settings.api_prefix}/upload",
            "jobs": f"{settings.api_prefix}/jobs",
            "download": f"{settings.api_prefix}/download",
            "health": f"{settings.api_prefix}/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )