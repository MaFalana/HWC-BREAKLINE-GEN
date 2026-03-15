"""
Configuration management for Surface Generation API
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Azure Storage Configuration
    azure_connection_string: str = Field(
        ..., 
        description="Azure Storage connection string",
        alias="AZURE_CONNECTION_STRING"
    )
    azure_storage_account_name: Optional[str] = Field(
        None,
        description="Azure Storage account name"
    )
    azure_storage_account_key: Optional[str] = Field(
        None,
        description="Azure Storage account key"
    )
    azure_storage_container: str = Field(
        ...,
        description="Blob container name for file storage",
        alias="AZURE_STORAGE_CONTAINER"
    )
    
    # MongoDB Configuration
    azure_mongo_connection_string: str = Field(
        ...,
        description="Azure Cosmos DB MongoDB connection string",
        alias="AZURE_MONGO_CONNECTION_STRING"
    )
    azure_mongo_database_name: str = Field(
        ...,
        description="MongoDB database name",
        alias="AZURE_MONGO_DATABASE_NAME"
    )
    jobs_collection_name: str = Field(
        default="jobs",
        description="Collection name for job tracking"
    )
    
    # File Processing Configuration
    max_file_size_mb: int = Field(
        default=10000,
        description="Maximum upload file size in MB",
        alias="MAX_FILE_SIZE_MB"
    )
    allowed_extensions: list[str] = Field(
        default=[".las", ".laz"],
        description="Allowed file extensions"
    )
    file_retention_hours: int = Field(
        default=24,
        description="Hours to retain files after job completion"
    )
    
    # API Configuration
    api_title: str = Field(
        default="Surface Generation API",
        description="API title"
    )
    api_version: str = Field(
        default="1.0.1",
        description="API version"
    )
    api_prefix: str = Field(
        default="/api/v1",
        description="API route prefix"
    )
    
    # Processing Configuration
    default_voxel_size: int = Field(
        default=25,
        description="Default voxel size for point cloud processing",
        alias="DEFAULT_VOXEL_SIZE"
    )
    default_threshold: float = Field(
        default=0.5,
        description="Default threshold for breakline detection",
        alias="DEFAULT_THRESHOLD"
    )
    default_nth_point: int = Field(
        default=1,
        description="Default nth point sampling"
    )
    
    # Server Configuration
    host: str = Field(
        default="0.0.0.0",
        description="Server host"
    )
    port: int = Field(
        default=8000,
        description="Server port"
    )
    workers: int = Field(
        default=1,
        description="Number of worker processes"
    )
    
    # Security Configuration
    cors_origins: list[str] = Field(
        default=["*"],
        description="CORS allowed origins"
    )
    api_key: Optional[str] = Field(
        None,
        description="Optional API key for authentication"
    )
    
    # Background Tasks Configuration
    cleanup_interval_seconds: int = Field(
        default=43200,
        description="Interval for cleanup task in seconds (12 hours)"
    )
    job_processing_interval_seconds: int = Field(
        default=10,
        description="Interval for job processing check in seconds"
    )
    
    class Config:
        env_file = ".env.dev"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from env file


# Global settings instance
settings = Settings()


def get_max_upload_size_bytes() -> int:
    """Get maximum upload size in bytes"""
    return settings.max_file_size_mb * 1024 * 1024


def validate_file_extension(filename: str) -> bool:
    """Check if file extension is allowed"""
    return any(filename.lower().endswith(ext) for ext in settings.allowed_extensions)