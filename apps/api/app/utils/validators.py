"""
File validation utilities
"""

import os
from typing import List, Optional
from fastapi import UploadFile
from pathlib import Path

from app.config import settings, get_max_upload_size_bytes, validate_file_extension
from app.utils.exceptions import InvalidFileTypeException, FileSizeLimitException


async def validate_upload_file(file: UploadFile) -> None:
    """
    Validate uploaded file
    
    Args:
        file: FastAPI UploadFile object
        
    Raises:
        InvalidFileTypeException: If file type is not allowed
        FileSizeLimitException: If file size exceeds limit
    """
    # Validate file extension
    if not validate_file_extension(file.filename):
        raise InvalidFileTypeException(file.filename, settings.allowed_extensions)
    
    # Validate file size
    # Read file size without loading entire file into memory
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    max_size_bytes = get_max_upload_size_bytes()
    if file_size > max_size_bytes:
        size_mb = file_size / (1024 * 1024)
        raise FileSizeLimitException(file.filename, size_mb, settings.max_file_size_mb)


async def validate_upload_files(files: List[UploadFile]) -> None:
    """
    Validate multiple uploaded files
    
    Args:
        files: List of FastAPI UploadFile objects
        
    Raises:
        InvalidFileTypeException: If any file type is not allowed
        FileSizeLimitException: If any file size exceeds limit
        ValueError: If no files provided
    """
    if not files:
        raise ValueError("No files provided")
    
    for file in files:
        await validate_upload_file(file)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Get just the filename, no path components
    filename = Path(filename).name
    
    # Remove any potentially dangerous characters
    # Allow only alphanumeric, dots, dashes, and underscores
    import re
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Ensure it has a valid extension
    if not validate_file_extension(sanitized):
        # If extension was mangled, try to preserve original extension
        original_ext = Path(filename).suffix.lower()
        if original_ext in settings.allowed_extensions:
            base_name = Path(sanitized).stem
            sanitized = f"{base_name}{original_ext}"
    
    return sanitized


def generate_blob_name(job_id: str, filename: str, folder: str = "input") -> str:
    """
    Generate blob storage name for a file
    
    Args:
        job_id: Job identifier
        filename: Original filename
        folder: Storage folder within the job (input/output)
        
    Returns:
        Blob name with path
    """
    sanitized_name = sanitize_filename(filename)
    return f"jobs/{job_id}/{folder}/{sanitized_name}"


def extract_filename_from_blob(blob_name: str) -> str:
    """
    Extract filename from blob storage path
    
    Args:
        blob_name: Full blob path
        
    Returns:
        Just the filename
    """
    return Path(blob_name).name


def validate_epsg_code(epsg: Optional[int]) -> Optional[int]:
    """
    Validate EPSG code
    
    Args:
        epsg: EPSG code to validate
        
    Returns:
        Validated EPSG code or None
        
    Raises:
        ValueError: If EPSG code is invalid
    """
    if epsg is None:
        return None
    
    if not isinstance(epsg, int) or epsg < 1000 or epsg > 99999:
        raise ValueError(f"Invalid EPSG code: {epsg}. Must be between 1000 and 99999.")
    
    return epsg