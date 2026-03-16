"""
File upload endpoints
"""

import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.models.responses import UploadResponse
from app.models.processing import ProcessingParameters
from app.services.job_manager import JobManager
from app.services.storage import StorageService
from app.utils.validators import validate_upload_files, generate_blob_name
from app.utils.exceptions import InvalidFileTypeException, FileSizeLimitException
from app.config import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post(
    "/",
    response_model=UploadResponse,
    summary="Upload files for processing",
    description="Upload one or more LAS/LAZ files for processing"
)
async def upload_files(
    files: List[UploadFile] = File(..., description="LAS/LAZ files to process"),
    voxel_size: Optional[int] = Form(None, ge=1, le=100),
    threshold: Optional[float] = Form(None, ge=0.1, le=5.0),
    nth_point: Optional[int] = Form(None, ge=1, le=100),
    source_epsg: Optional[int] = Form(None, ge=1000, le=99999),
    target_epsg: Optional[int] = Form(None, ge=1000, le=99999),
    output_formats: Optional[str] = Form(None, description="Comma-separated list: dxf,csv"),
    merge_outputs: Optional[bool] = Form(False),
    merged_output_name: Optional[str] = Form(None)
):
    """
    Upload files for processing
    
    Processing parameters can be provided as form fields. If not provided,
    defaults will be used.
    """
    try:
        # Validate files
        await validate_upload_files(files)
        
        # Parse output formats if provided
        formats_list = None
        if output_formats:
            formats_list = [fmt.strip().lower() for fmt in output_formats.split(",")]
        
        # Create processing parameters (handle empty strings as None)
        processing_params = ProcessingParameters(
            voxel_size=voxel_size or settings.default_voxel_size,
            threshold=threshold or settings.default_threshold,
            nth_point=nth_point or settings.default_nth_point,
            source_epsg=source_epsg if source_epsg else None,
            target_epsg=target_epsg if target_epsg else None,
            output_formats=formats_list or ["dxf"],
            merge_outputs=merge_outputs or False,
            merged_output_name=merged_output_name if merged_output_name else None
        )
        
        # Initialize services
        job_manager = JobManager()
        storage_service = StorageService()
        
        # Generate job ID first
        job_id = str(uuid.uuid4())
        
        # Upload files to blob storage with validation
        uploaded_blob_names = []
        failed_uploads = []
        
        for file in files:
            blob_name = generate_blob_name(job_id, file.filename, "input")
            
            try:
                # Upload file
                await storage_service.upload_file(
                    file.file,
                    blob_name,
                    file.content_type or "application/octet-stream"
                )
                
                # Verify upload succeeded
                blob_exists = await storage_service.blob_exists(blob_name)
                if blob_exists:
                    uploaded_blob_names.append(blob_name)
                    logger.info(f"Successfully uploaded and verified: {file.filename} -> {blob_name}")
                else:
                    failed_uploads.append(f"{file.filename} (upload verification failed)")
                    logger.error(f"Upload verification failed for {blob_name}")
                    
            except Exception as e:
                failed_uploads.append(f"{file.filename} (upload error: {str(e)})")
                logger.error(f"Failed to upload {file.filename} to {blob_name}: {str(e)}")
        
        # If any uploads failed, clean up and return error
        if failed_uploads:
            # Clean up any successful uploads
            for blob_name in uploaded_blob_names:
                try:
                    await storage_service.delete_file(blob_name)
                    logger.info(f"Cleaned up partial upload: {blob_name}")
                except:
                    pass  # Best effort cleanup
            
            error_msg = f"Upload failed for {len(failed_uploads)} files: {', '.join(failed_uploads)}"
            logger.error(f"Job {job_id} upload failed: {error_msg}")
            raise HTTPException(
                status_code=500, 
                detail=f"File upload failed. {error_msg}"
            )
        
        logger.info(f"All {len(uploaded_blob_names)} files uploaded successfully with full blob paths")
        
        # Create job with the pre-determined ID and uploaded files
        job = await job_manager.create_job_with_id(
            job_id,
            uploaded_blob_names,
            processing_params
        )
        
        return UploadResponse(
            job_id=job.id,
            status=job.status,
            message="Files uploaded successfully. Processing will begin shortly.",
            files_uploaded=len(uploaded_blob_names)
        )
        
    except (InvalidFileTypeException, FileSizeLimitException) as e:
        raise e
    except ValueError as e:
        logger.error(f"Upload validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post(
    "/validate",
    summary="Validate files without uploading",
    description="Check if files are valid for processing"
)
async def validate_files(
    files: List[UploadFile] = File(..., description="Files to validate")
):
    """
    Validate files without actually uploading them
    """
    try:
        await validate_upload_files(files)
        
        file_info = []
        for file in files:
            file.file.seek(0, 2)
            size_mb = file.file.tell() / (1024 * 1024)
            file.file.seek(0)
            
            file_info.append({
                "filename": file.filename,
                "size_mb": round(size_mb, 2),
                "valid": True
            })
        
        return {
            "valid": True,
            "files": file_info,
            "total_size_mb": round(sum(f["size_mb"] for f in file_info), 2)
        }
        
    except (InvalidFileTypeException, FileSizeLimitException) as e:
        raise e
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))