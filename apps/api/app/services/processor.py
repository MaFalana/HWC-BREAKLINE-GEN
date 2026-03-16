"""
LiDAR processing service wrapper
"""

import logging
import tempfile
import os
import asyncio
from typing import List, Dict, Any
from pathlib import Path
import sys

# Add source directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from source.process import LiDARProcessor, ProcessingParameters as LiDARParams
from app.services.storage import StorageService
from app.utils.exceptions import ProcessingException


logger = logging.getLogger(__name__)

# Content types for output formats
CONTENT_TYPES = {
    "dxf": "application/dxf",
    "csv": "text/csv",
    "preview": "text/csv",
}


class ProcessorService:
    """Service wrapper for LiDAR processing"""

    def __init__(self):
        self.storage_service = StorageService()

    async def process_job(
        self,
        job_id: str,
        input_blob_names: List[str],
        processing_params: Dict[str, Any],
    ) -> tuple[List[str], int]:
        """Process a job's input files and upload outputs to blob storage.

        Returns:
            Tuple of (output_blob_names, total_processed_points)
        """
        temp_dir = None
        output_blob_names: List[str] = []

        try:
            temp_dir = tempfile.mkdtemp()
            input_dir = os.path.join(temp_dir, "input")
            output_dir = os.path.join(temp_dir, "output")
            os.makedirs(input_dir)
            os.makedirs(output_dir)

            # Validate all input blobs exist
            validated_blob_names = await self._validate_input_blobs(job_id, input_blob_names)

            # Download input files
            input_paths = []
            for blob_name in validated_blob_names:
                filename = Path(blob_name).name
                local_path = os.path.join(input_dir, filename)
                file_data = await self.storage_service.download_file(blob_name)
                with open(local_path, "wb") as f:
                    f.write(file_data)
                input_paths.append(local_path)
                logger.info(f"Downloaded {blob_name}")

            # Run LiDAR processing in a thread so we don't block the event loop
            lidar_params = self._convert_parameters(input_paths, output_dir, processing_params)
            processor = LiDARProcessor(lidar_params)

            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, processor.process_files)

            # Check for failures
            failed = [r for r in results if not r.success]
            if failed:
                msgs = [f"{r.basename}: {r.error_message}" for r in failed]
                raise ProcessingException(job_id, "; ".join(msgs))

            # Upload output files and tally processed points
            total_processed_points = 0
            for result in results:
                if not result.success or not result.output_files:
                    continue
                if result.points is not None:
                    total_processed_points += len(result.points)
                for fmt, file_path in result.output_files.items():
                    if os.path.exists(file_path):
                        filename = Path(file_path).name
                        blob_name = f"jobs/{job_id}/output/{filename}"
                        with open(file_path, "rb") as f:
                            await self.storage_service.upload_file(
                                f, blob_name, CONTENT_TYPES.get(fmt, "application/octet-stream")
                            )
                        output_blob_names.append(blob_name)
                        logger.info(f"Uploaded {filename}")

            logger.info(
                f"Job {job_id} complete: {len(output_blob_names)} outputs, "
                f"{total_processed_points} processed points"
            )
            return output_blob_names, total_processed_points

        except ProcessingException:
            raise
        except Exception as e:
            logger.error(f"Processing failed for job {job_id}: {e}")
            raise ProcessingException(job_id, str(e))
        finally:
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _validate_input_blobs(
        self, job_id: str, blob_names: List[str]
    ) -> List[str]:
        """Validate all input blobs exist with retry, raise on missing."""
        import asyncio

        validated = []
        missing = []
        for blob_name in blob_names:
            found = False
            for attempt in range(4):  # initial + 3 retries
                if await self.storage_service.blob_exists(blob_name):
                    found = True
                    break
                if attempt < 3:
                    logger.warning(f"Blob {blob_name} not found (attempt {attempt + 1}), retrying...")
                    await asyncio.sleep(2)
            if found:
                validated.append(blob_name)
            else:
                missing.append(blob_name)

        if missing:
            raise ProcessingException(
                job_id,
                f"Missing input files: {', '.join(missing)}. "
                f"Found {len(validated)}/{len(blob_names)} expected files.",
            )
        return validated

    @staticmethod
    def _convert_parameters(
        file_paths: List[str], output_dir: str, params: Dict[str, Any]
    ) -> LiDARParams:
        """Convert API parameters to LiDAR processing parameters."""
        return LiDARParams(
            file_paths=file_paths,
            voxel_size=params.get("voxel_size", 25),
            threshold=params.get("threshold", 0.5),
            nth_point=params.get("nth_point", 1),
            source_epsg=params.get("source_epsg"),
            target_epsg=params.get("target_epsg"),
            output_formats=params.get("output_formats", ["dxf"]),
            output_dir=output_dir,
            merge_outputs=params.get("merge_outputs", False),
            merged_output_name=params.get("merged_output_name"),
            log_file=os.path.join(output_dir, "processing.log"),
        )
