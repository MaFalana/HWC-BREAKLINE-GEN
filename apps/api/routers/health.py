"""
Health check endpoints
"""

import logging
from fastapi import APIRouter

from app.models.responses import HealthResponse
from app.services.storage import StorageService
from app.db.mongo_client import MongoJobClient
from app.config import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "/",
    response_model=HealthResponse,
    summary="Health check",
    description="Check the health status of the API and its dependencies"
)
async def health_check():
    """
    Perform health check on all services
    """
    try:
        # Check Azure Storage
        storage_service = StorageService()
        storage_healthy = await storage_service.health_check()
        
        # Check MongoDB
        mongo_client = MongoJobClient()
        mongo_healthy = await mongo_client.health_check()
        
        # Overall health
        all_healthy = storage_healthy and mongo_healthy
        
        return HealthResponse(
            status="healthy" if all_healthy else "degraded",
            version=settings.api_version,
            services={
                "azure_storage": storage_healthy,
                "mongodb": mongo_healthy,
                "processor": True  # Always true if the API is running
            }
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            version=settings.api_version,
            services={
                "azure_storage": False,
                "mongodb": False,
                "processor": False
            }
        )


@router.get(
    "/ready",
    summary="Readiness check",
    description="Check if the API is ready to handle requests"
)
async def readiness_check():
    """
    Simple readiness check
    """
    return {"ready": True}


@router.get(
    "/live",
    summary="Liveness check",
    description="Check if the API is alive"
)
async def liveness_check():
    """
    Simple liveness check
    """
    return {"alive": True}