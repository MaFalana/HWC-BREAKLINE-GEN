"""
API routers
"""

from .upload import router as upload_router
from .jobs import router as jobs_router
from .download import router as download_router
from .health import router as health_router
from .cleanup import router as cleanup_router

__all__ = [
    "upload_router",
    "jobs_router",
    "download_router",
    "health_router",
    "cleanup_router"
]