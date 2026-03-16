"""
Configuration management for Surface Generation API

Env vars (set in .env locally, GitHub Actions secrets/vars in prod):
  AZURE_CONNECTION_STRING          – Azure Blob Storage connection string
  MONGO_CONNECTION_STRING          – Cosmos DB Mongo connection string
  NAME                             – shared name for blob container + mongo db/collection
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

    # ── Env-driven settings (match .env / GitHub Actions) ──────────────

    azure_connection_string: str = Field(
        ...,
        description="Azure Blob Storage connection string",
    )

    mongo_connection_string: str = Field(
        ...,
        description="Cosmos DB MongoDB connection string",
    )

    name: str = Field(
        default="hwc-breakline-generator",
        description="Shared project name used for blob container and mongo database/collection",
    )

    # ── Derived helpers (use `name` as the single source) ──────────────

    @property
    def azure_storage_container(self) -> str:
        return self.name

    @property
    def azure_mongo_database_name(self) -> str:
        return self.name

    @property
    def jobs_collection_name(self) -> str:
        return "jobs"

    # ── File Processing ────────────────────────────────────────────────

    max_file_size_mb: int = Field(
        default=10000,
        description="Maximum upload file size in MB",
    )
    allowed_extensions: list[str] = Field(
        default=[".las", ".laz"],
        description="Allowed file extensions"
    )
    file_retention_hours: int = Field(
        default=24,
        description="Hours to retain files after job completion"
    )

    # ── API ────────────────────────────────────────────────────────────

    api_title: str = Field(default="Surface Generation API")
    api_version: str = Field(default="1.0.1")
    api_prefix: str = Field(default="/api/v1")

    # ── Processing defaults ────────────────────────────────────────────

    default_voxel_size: int = Field(default=25, ge=1, le=100)
    default_threshold: float = Field(default=0.5, ge=0.1, le=5.0)
    default_nth_point: int = Field(default=1, ge=1)

    # ── Server ─────────────────────────────────────────────────────────

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=1)

    # ── Security ───────────────────────────────────────────────────────

    cors_origins: list[str] = Field(default=["*"])
    api_key: Optional[str] = Field(default=None)

    # ── Background tasks ───────────────────────────────────────────────

    cleanup_interval_seconds: int = Field(default=43200)
    job_processing_interval_seconds: int = Field(default=10)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


def get_max_upload_size_bytes() -> int:
    """Get maximum upload size in bytes"""
    return settings.max_file_size_mb * 1024 * 1024


def validate_file_extension(filename: str) -> bool:
    """Check if file extension is allowed"""
    return any(filename.lower().endswith(ext) for ext in settings.allowed_extensions)