"""
Custom exceptions for Surface Generation API
"""

from typing import Optional
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for API errors"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[dict] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class JobNotFoundException(BaseAPIException):
    """Exception raised when job is not found"""
    def __init__(self, job_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found"
        )


class InvalidFileTypeException(BaseAPIException):
    """Exception raised for invalid file types"""
    def __init__(self, filename: str, allowed_types: list):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Allowed types: {', '.join(allowed_types)}"
        )


class FileSizeLimitException(BaseAPIException):
    """Exception raised when file size exceeds limit"""
    def __init__(self, filename: str, size_mb: float, limit_mb: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File '{filename}' size ({size_mb:.1f} MB) exceeds limit ({limit_mb} MB)"
        )


class StorageException(BaseAPIException):
    """Exception raised for storage operation failures"""
    def __init__(self, operation: str, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage {operation} failed: {detail}"
        )


class ProcessingException(BaseAPIException):
    """Exception raised for processing failures"""
    def __init__(self, job_id: str, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed for job '{job_id}': {detail}"
        )


class JobNotCompletedException(BaseAPIException):
    """Exception raised when trying to download incomplete job"""
    def __init__(self, job_id: str, current_status: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job '{job_id}' is not completed. Current status: {current_status}"
        )


class ServiceUnavailableException(BaseAPIException):
    """Exception raised when a required service is unavailable"""
    def __init__(self, service: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service '{service}' is currently unavailable"
        )