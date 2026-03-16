"""
Azure Blob Storage service for file operations
"""

import logging
from typing import List, Optional, BinaryIO, Dict
from datetime import datetime, timedelta

from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient, BlobSasPermissions, generate_blob_sas
from azure.core.exceptions import ResourceNotFoundError, ResourceExistsError

from app.config import settings
from app.utils.exceptions import StorageException


logger = logging.getLogger(__name__)


class StorageService:
    """Service for Azure Blob Storage operations"""
    
    def __init__(self):
        """Initialize Azure Blob Storage client"""
        try:
            self.blob_service_client = BlobServiceClient.from_connection_string(
                settings.azure_connection_string
            )
            self.container_client = self.blob_service_client.get_container_client(
                settings.azure_storage_container
            )
            
            # Extract account name and key from connection string for SAS generation
            conn_parts = dict(part.split('=', 1) for part in settings.azure_connection_string.split(';') if '=' in part)
            self.account_name = conn_parts.get('AccountName')
            self.account_key = conn_parts.get('AccountKey')
            
            if not self.account_name or not self.account_key:
                logger.error(f"Failed to extract account credentials. Found account_name: {bool(self.account_name)}, account_key: {bool(self.account_key)}")
                raise StorageException("initialization", "Could not extract account credentials from connection string")
            
            # Ensure container exists
            self._ensure_container_exists()
        except Exception as e:
            logger.error(f"Failed to initialize storage service: {str(e)}")
            raise StorageException("initialization", str(e))
    
    def _ensure_container_exists(self) -> None:
        """Create container if it doesn't exist"""
        try:
            self.container_client.create_container()
            logger.info(f"Created container '{settings.azure_storage_container}'")
        except ResourceExistsError:
            logger.info(f"Container '{settings.azure_storage_container}' already exists")
        except Exception as e:
            logger.error(f"Failed to create container: {str(e)}")
            raise StorageException("container creation", str(e))
    
    async def upload_file(
        self,
        file_stream: BinaryIO,
        blob_name: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload a file to blob storage with comprehensive validation
        
        Args:
            file_stream: File stream to upload
            blob_name: Name for the blob (including path)
            content_type: MIME type of the file
            
        Returns:
            Blob URL
            
        Raises:
            StorageException: If upload fails
        """
        try:
            # Ensure we're at the beginning of the file stream
            file_stream.seek(0)
            
            # Read file data to ensure it's not empty
            file_data = file_stream.read()
            if not file_data:
                raise StorageException("file upload", f"File stream is empty for blob {blob_name}")
            
            logger.info(f"Uploading {len(file_data)} bytes to blob: {blob_name}")
            
            # Get blob client
            blob_client = self.container_client.get_blob_client(blob_name)
            
            # Delete existing blob if it exists (for clean overwrite)
            try:
                await self._run_in_executor(blob_client.delete_blob)
                logger.info(f"Deleted existing blob: {blob_name}")
            except Exception:
                pass  # Blob doesn't exist, which is fine
            
            # Upload the file with proper error handling
            from azure.storage.blob import ContentSettings
            content_settings = ContentSettings(content_type=content_type)
            
            # Use run_in_executor to properly handle sync operation in async context
            def _upload_with_settings():
                return blob_client.upload_blob(
                    file_data,
                    overwrite=True,
                    content_settings=content_settings
                )
            
            upload_result = await self._run_in_executor(_upload_with_settings)
            
            logger.info(f"Upload result: {upload_result}")
            
            # Immediately verify the upload succeeded
            try:
                exists = await self._run_in_executor(blob_client.exists)
                if not exists:
                    raise StorageException("file upload", f"Upload appeared successful but blob {blob_name} does not exist")
                
                # Get blob properties to verify size
                properties = await self._run_in_executor(blob_client.get_blob_properties)
                uploaded_size = properties.size
                
                if uploaded_size != len(file_data):
                    raise StorageException(
                        "file upload", 
                        f"Upload size mismatch for {blob_name}: expected {len(file_data)} bytes, got {uploaded_size} bytes"
                    )
                
                logger.info(f"Successfully uploaded and verified {uploaded_size} bytes to blob: {blob_name}")
                return blob_client.url
                
            except StorageException:
                raise
            except Exception as e:
                raise StorageException("file upload", f"Upload verification failed for {blob_name}: {str(e)}")
            
        except StorageException:
            raise
        except Exception as e:
            logger.error(f"Failed to upload file {blob_name}: {str(e)}")
            logger.error(f"Container: {settings.azure_storage_container}")
            logger.error(f"Connection string configured: {bool(settings.azure_connection_string)}")
            raise StorageException("file upload", str(e))
    
    async def _run_in_executor(self, func, *args):
        """Run synchronous function in thread pool executor"""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args)
    
    async def download_file(self, blob_name: str) -> bytes:
        """Download a file from blob storage."""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)

            exists = await self._run_in_executor(blob_client.exists)
            if not exists:
                raise StorageException("file download", f"File not found: {blob_name}")

            def _download():
                return blob_client.download_blob().readall()

            data = await self._run_in_executor(_download)
            logger.info(f"Downloaded blob: {blob_name}")
            return data

        except StorageException:
            raise
        except ResourceNotFoundError:
            raise StorageException("file download", f"File not found: {blob_name}")
        except Exception as e:
            logger.error(f"Failed to download file {blob_name}: {str(e)}")
            raise StorageException("file download", str(e))
    
    
    async def delete_file(self, blob_name: str) -> None:
        """Delete a file from blob storage."""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            await self._run_in_executor(blob_client.delete_blob)
            logger.info(f"Deleted blob: {blob_name}")
        except ResourceNotFoundError:
            logger.warning(f"Blob not found for deletion: {blob_name}")
        except Exception as e:
            logger.error(f"Failed to delete file {blob_name}: {str(e)}")
            raise StorageException("file deletion", str(e))
    
    async def delete_job_files(self, job_id: str) -> None:
        """Delete all files associated with a job."""
        try:
            prefixes = [f"jobs/{job_id}/"]
            for prefix in prefixes:
                blob_names = await self.list_blobs(prefix)
                for name in blob_names:
                    await self.delete_file(name)
            logger.info(f"Deleted all files for job: {job_id}")
        except Exception as e:
            logger.error(f"Failed to delete files for job {job_id}: {str(e)}")
            raise StorageException("job files deletion", str(e))
    
    
    
    def generate_download_url(
        self,
        blob_name: str,
        expiry_hours: int = 1,
        filename: Optional[str] = None
    ) -> str:
        """
        Generate a SAS URL for downloading a blob
        
        Args:
            blob_name: Name of the blob
            expiry_hours: Hours until URL expires
            filename: Optional filename for Content-Disposition header
            
        Returns:
            SAS URL for downloading
            
        Raises:
            StorageException: If URL generation fails
        """
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            
            # Generate SAS token with proper parameters
            expiry_time = datetime.utcnow() + timedelta(hours=expiry_hours)
            
            sas_token = generate_blob_sas(
                account_name=self.account_name,
                container_name=settings.azure_storage_container,
                blob_name=blob_name,
                account_key=self.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=expiry_time,
                content_disposition=f"attachment; filename={filename}" if filename else None
            )
            
            # Build URL with SAS token
            url = f"{blob_client.url}?{sas_token}"
            
            logger.info(f"Generated download URL for blob: {blob_name}")
            return url
            
        except Exception as e:
            logger.error(f"Failed to generate download URL for {blob_name}: {str(e)}")
            raise StorageException("URL generation", str(e))
    
    def generate_download_urls(
        self,
        blob_names: List[str],
        expiry_hours: int = 1
    ) -> Dict[str, str]:
        """
        Generate SAS URLs for multiple blobs
        
        Args:
            blob_names: List of blob names
            expiry_hours: Hours until URLs expire
            
        Returns:
            Dictionary mapping blob names to download URLs
        """
        urls = {}
        
        for blob_name in blob_names:
            try:
                # Extract just the filename for the download
                from pathlib import Path
                filename = Path(blob_name).name
                urls[filename] = self.generate_download_url(
                    blob_name,
                    expiry_hours,
                    filename
                )
            except Exception as e:
                logger.error(f"Failed to generate URL for {blob_name}: {str(e)}")
                urls[blob_name] = None
        
        return urls
    
    async def list_blobs(self, prefix: str) -> List[str]:
        """List blobs with a given prefix."""
        try:
            def _list():
                return [b.name for b in self.container_client.list_blobs(name_starts_with=prefix)]

            blob_names = await self._run_in_executor(_list)
            logger.info(f"Listed {len(blob_names)} blobs with prefix: {prefix}")
            return blob_names
        except Exception as e:
            logger.error(f"Failed to list blobs with prefix {prefix}: {str(e)}")
            return []
    
    async def blob_exists(self, blob_name: str) -> bool:
        """Check if a blob exists."""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            return await self._run_in_executor(blob_client.exists)
        except Exception as e:
            logger.error(f"Failed to check blob existence {blob_name}: {str(e)}")
            return False
    
    async def health_check(self) -> bool:
        """Check if Azure Blob Storage is accessible."""
        try:
            def _ping():
                self.container_client.get_container_properties()

            await self._run_in_executor(_ping)
            return True
        except Exception as e:
            logger.error(f"Azure Blob Storage health check failed: {str(e)}")
            return False