"""
LiDAR processing service wrapper
"""

import logging
import tempfile
import os
from typing import List, Dict, Any
from pathlib import Path
import sys
import numpy as np
import laspy

# Add source directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from source.process import LiDARProcessor, ProcessingParameters as LiDARParams, ProcessingResult
from app.models.processing import ProcessingParameters
from app.services.storage import StorageService
from app.utils.exceptions import ProcessingException


logger = logging.getLogger(__name__)


class ProcessorService:
    """Service wrapper for LiDAR processing"""
    
    # Standard LAS classification mapping
    CLASSIFICATION_MAP = {
        0: "Never Classified",
        1: "Unclassified",
        2: "Ground",
        3: "Low Vegetation",
        4: "Medium Vegetation",
        5: "High Vegetation",
        6: "Building",
        7: "Low Point",
        8: "Model Key Point",
        9: "Water",
        10: "Rail",
        11: "Road Surface",
        12: "Overlap Points",
        13: "Wire Guard",
        14: "Wire Conductor",
        15: "Transmission Tower",
        16: "Wire Structure Connector",
        17: "Bridge Deck",
        18: "High Noise"
    }
    
    def __init__(self):
        """Initialize processor service"""
        self.storage_service = StorageService()
    
    async def process_job(
        self,
        job_id: str,
        input_blob_names: List[str],
        processing_params: Dict[str, Any]
    ) -> tuple[List[str], Dict[str, List[Dict[str, Any]]], int, Dict[str, int]]:
        """
        Process a job's files
        
        Args:
            job_id: Job identifier
            input_blob_names: List of input blob names
            processing_params: Processing parameters dictionary
            
        Returns:
            Tuple of (output blob names, processed preview points per file, total processed points count, per file processed points count)
            
        Raises:
            ProcessingException: If processing fails
        """
        temp_dir = None
        output_blob_names = []
        processed_preview_points = {}
        per_file_processed_points = {}
        
        try:
            # Create temporary directory for processing
            temp_dir = tempfile.mkdtemp()
            input_dir = os.path.join(temp_dir, "input")
            output_dir = os.path.join(temp_dir, "output")
            os.makedirs(input_dir)
            os.makedirs(output_dir)
            
            logger.info(f"[DEBUG] Processing job {job_id} with {len(input_blob_names)} files")
            logger.info(f"[DEBUG] Input blob names: {input_blob_names}")
            
            # First, validate all input files exist before starting processing with retry logic
            validated_blob_names = []
            missing_blobs = []
            
            for blob_name in input_blob_names:
                # All input files are stored as full blob paths: uploads/job_id/filename.las
                # Use them directly since upload logic always creates full paths
                full_blob_name = blob_name
                logger.info(f"Using stored blob path: {full_blob_name}")
                
                # Validate blob exists with retry logic (for Azure consistency issues)
                blob_exists = await self._validate_blob_exists_with_retry(full_blob_name, max_retries=3, retry_delay=2)
                
                if blob_exists:
                    validated_blob_names.append(full_blob_name)
                    logger.info(f"Validated blob exists: {full_blob_name}")
                else:
                    missing_blobs.append(full_blob_name)
                    logger.error(f"Blob not found after retries: {full_blob_name}")
            
            # If any blobs are missing, fail with detailed error message
            if missing_blobs:
                error_msg = f"Missing input files in Azure Blob Storage: {', '.join(missing_blobs)}. " \
                           f"This may indicate an upload failure or corrupted job data. " \
                           f"Found {len(validated_blob_names)}/{len(input_blob_names)} expected files."
                logger.error(f"Job {job_id} validation failed: {error_msg}")
                raise ProcessingException(job_id, error_msg)
            
            logger.info(f"All {len(validated_blob_names)} input files validated successfully")
            
            # Download input files (all blobs already validated)
            input_paths = []
            for full_blob_name in validated_blob_names:
                filename = Path(full_blob_name).name
                local_path = os.path.join(input_dir, filename)
                
                # Download from blob storage (no need to revalidate, already done above)
                logger.info(f"Downloading validated blob: {full_blob_name}")
                file_data = await self.storage_service.download_file(full_blob_name)
                with open(local_path, 'wb') as f:
                    f.write(file_data)
                
                input_paths.append(local_path)
                logger.info(f"Downloaded {full_blob_name} to {local_path}")
            
            # Convert parameters
            lidar_params = self._convert_parameters(
                input_paths,
                output_dir,
                processing_params
            )
            
            # Process files
            processor = LiDARProcessor(lidar_params)
            results = processor.process_files()
            
            # Check for failures
            failed_results = [r for r in results if not r.success]
            if failed_results:
                error_messages = [f"{r.basename}: {r.error_message}" for r in failed_results]
                raise ProcessingException(job_id, "; ".join(error_messages))
            
            # Extract processed preview points from successful results and calculate total processed points
            total_processed_points = 0
            logger.info(f"Starting preview extraction from {len(results)} processing results")
            for result in results:
                logger.info(f"Processing result for {result.basename}: success={result.success}, points_type={type(result.points)}, points_shape={result.points.shape if result.points is not None else 'None'}")
                
                # Extract original input filename from the result's file_path
                original_filename = Path(result.file_path).name
                logger.info(f"[DEBUG] Result file_path: {result.file_path}, extracted filename: {original_filename}, basename: {result.basename}")
                
                if result.success and result.points is not None and len(result.points) > 0:
                    # Pass the local file path to access classification data
                    local_file_path = next((path for path in input_paths if Path(path).name == original_filename), None)
                    logger.info(f"[DEBUG] Local file path for classification: {local_file_path}")
                    preview_points = self._extract_processed_preview_points(result, local_file_path)
                    # Store preview points using the original filename as key (including extension)
                    # This ensures the preview route can find them when looking up by input filename
                    processed_preview_points[original_filename] = preview_points
                    logger.info(f"Extracted {len(preview_points)} preview points for KEY: '{original_filename}' (output: {result.basename})")
                    # Store the processed points count for this specific file
                    file_processed_count = len(result.points)
                    per_file_processed_points[original_filename] = file_processed_count
                    # Add to the total number of processed points
                    total_processed_points += file_processed_count
                else:
                    logger.warning(f"Skipping preview extraction for {original_filename}: success={result.success}, points={'None' if result.points is None else f'array with {len(result.points)} points'}")
                    if result.success:
                        # Still count processed points even if we can't extract preview
                        if result.points is not None:
                            file_processed_count = len(result.points)
                            per_file_processed_points[original_filename] = file_processed_count
                            total_processed_points += file_processed_count
            
            # Upload output files
            for result in results:
                if result.success and result.output_files:
                    for format_type, file_path in result.output_files.items():
                        if os.path.exists(file_path):
                            # Generate blob name
                            filename = Path(file_path).name
                            blob_name = f"outputs/{job_id}/{filename}"
                            
                            # Upload to blob storage
                            with open(file_path, 'rb') as f:
                                await self.storage_service.upload_file(
                                    f,
                                    blob_name,
                                    self._get_content_type(format_type)
                                )
                            
                            output_blob_names.append(blob_name)
                            logger.info(f"Uploaded {filename} to {blob_name}")
            
            logger.info(f"Successfully processed job {job_id}, created {len(output_blob_names)} output files, processed {total_processed_points} points total")
            logger.info(f"[DEBUG] Returning processed_preview_points with keys: {list(processed_preview_points.keys())}")
            logger.info(f"[DEBUG] Per-file processed points: {per_file_processed_points}")
            return output_blob_names, processed_preview_points, total_processed_points, per_file_processed_points
            
        except Exception as e:
            logger.error(f"Processing failed for job {job_id}: {str(e)}")
            raise ProcessingException(job_id, str(e))
            
        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temporary directory: {temp_dir}")
    
    def _convert_parameters(
        self,
        file_paths: List[str],
        output_dir: str,
        params: Dict[str, Any]
    ) -> LiDARParams:
        """
        Convert API parameters to LiDAR processing parameters
        
        Args:
            file_paths: List of input file paths
            output_dir: Output directory path
            params: Processing parameters dictionary
            
        Returns:
            LiDAR processing parameters
        """
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
            log_file=os.path.join(output_dir, "processing.log")
        )
    
    def _get_content_type(self, format_type: str) -> str:
        """
        Get MIME type for output format
        
        Args:
            format_type: Output format (dxf, csv)
            
        Returns:
            MIME type
        """
        content_types = {
            "dxf": "application/dxf",
            "csv": "text/csv"
        }
        return content_types.get(format_type, "application/octet-stream")
    
    def _extract_processed_preview_points(self, result: ProcessingResult, original_file_path: str = None, max_points: int = 50) -> List[Dict[str, Any]]:
        """
        Extract first N processed points from ProcessingResult in PNEZD format with actual classifications
        
        Args:
            result: ProcessingResult containing processed points
            original_file_path: Path to original LAS file for classification lookup
            max_points: Maximum number of points to extract
            
        Returns:
            List of points in PNEZD format as dictionaries
        """
        logger.info(f"[CLASSIFICATION DEBUG] Starting _extract_processed_preview_points")
        logger.info(f"[CLASSIFICATION DEBUG] result.points type: {type(result.points)}")
        logger.info(f"[CLASSIFICATION DEBUG] result.points shape: {result.points.shape if result.points is not None else 'None'}")
        logger.info(f"[CLASSIFICATION DEBUG] original_file_path: {original_file_path}")
        logger.info(f"[CLASSIFICATION DEBUG] File exists check: {os.path.exists(original_file_path) if original_file_path else 'path is None'}")
        
        points = []
        
        if result.points is None or len(result.points) == 0:
            logger.info(f"[CLASSIFICATION DEBUG] No processed points to extract")
            return points
            
        # Convert to numpy array if not already
        points_array = np.array(result.points)
        logger.info(f"[CLASSIFICATION DEBUG] Converted to numpy array, shape: {points_array.shape}")
        
        # Try to read original classification data if file path is provided
        original_classifications = None
        original_points = None
        
        if original_file_path and os.path.exists(original_file_path):
            try:
                logger.info(f"[CLASSIFICATION DEBUG] Opening LAS file: {original_file_path}")
                with laspy.open(original_file_path) as las_file:
                    logger.info(f"[CLASSIFICATION DEBUG] Successfully opened LAS file")
                    las_data = las_file.read()
                    logger.info(f"[CLASSIFICATION DEBUG] Read LAS data, points count: {len(las_data.x)}")
                    
                    # Log available attributes
                    logger.info(f"[CLASSIFICATION DEBUG] Available LAS attributes: {dir(las_data)}")
                    
                    original_points = np.column_stack((las_data.x, las_data.y, las_data.z))
                    logger.info(f"[CLASSIFICATION DEBUG] Original points array shape: {original_points.shape}")
                    logger.info(f"[CLASSIFICATION DEBUG] Original points sample (first 3): {original_points[:3] if len(original_points) > 3 else original_points}")
                    logger.info(f"[CLASSIFICATION DEBUG] Processed points sample (first 3): {points_array[:3] if len(points_array) > 3 else points_array}")
                    
                    if hasattr(las_data, 'classification'):
                        # Convert SubFieldView to numpy array
                        original_classifications = np.array(las_data.classification)
                        unique_classes = np.unique(original_classifications)
                        logger.info(f"[CLASSIFICATION DEBUG] Found {len(original_classifications)} points with classifications")
                        logger.info(f"[CLASSIFICATION DEBUG] Unique classification codes: {unique_classes}")
                        logger.info(f"[CLASSIFICATION DEBUG] Classification sample (first 10): {original_classifications[:10]}")
                        
                        # Map classification codes to descriptions
                        class_counts = {}
                        for code in unique_classes:
                            count = np.sum(original_classifications == code)
                            desc = self.CLASSIFICATION_MAP.get(code, f"Class {code}")
                            class_counts[desc] = count
                        logger.info(f"[CLASSIFICATION DEBUG] Classification breakdown: {class_counts}")
                    else:
                        logger.warning(f"[CLASSIFICATION DEBUG] No 'classification' attribute found in LAS file")
                        logger.info(f"[CLASSIFICATION DEBUG] Available attributes: {[attr for attr in dir(las_data) if not attr.startswith('_')]}")
                        
            except Exception as e:
                logger.error(f"[CLASSIFICATION DEBUG] Error reading LAS file: {e}")
                import traceback
                logger.error(f"[CLASSIFICATION DEBUG] Traceback: {traceback.format_exc()}")
        else:
            logger.warning(f"[CLASSIFICATION DEBUG] File path is None or file doesn't exist: {original_file_path}")
        
        # Determine how many points to extract
        num_points = min(len(points_array), max_points)
        logger.info(f"[CLASSIFICATION DEBUG] Extracting {num_points} points (max_points={max_points})")
        
        successful_matches = 0
        for i in range(num_points):
            point = points_array[i]
            logger.info(f"[CLASSIFICATION DEBUG] Processing point {i+1}: {point}")
            
            # Find the classification for this processed point by matching coordinates
            classification_desc = "Processed Surface Point"
            classification_code = None
            min_distance = float('inf')
            
            if original_classifications is not None and original_points is not None:
                # Use area-based classification: find all points within a radius and use most common classification
                search_radius = 10.0  # 10 meters - reasonable area for surface point classification
                
                # Calculate distances to all original points
                distances = np.sqrt(np.sum((original_points - point) ** 2, axis=1))
                
                # Find all points within the search radius
                nearby_indices = np.where(distances <= search_radius)[0]
                
                logger.info(f"[CLASSIFICATION DEBUG] Point {i+1} found {len(nearby_indices)} original points within {search_radius}m radius")
                
                if len(nearby_indices) > 0:
                    # Get classifications of all nearby points
                    nearby_classifications = original_classifications[nearby_indices]
                    
                    # Find the most common classification (mode)
                    unique_classes, counts = np.unique(nearby_classifications, return_counts=True)
                    most_common_idx = np.argmax(counts)
                    classification_code = int(unique_classes[most_common_idx].item())
                    most_common_count = counts[most_common_idx]
                    
                    # Get the classification description
                    classification_desc = self.CLASSIFICATION_MAP.get(
                        classification_code, 
                        f"Class {classification_code}"
                    )
                    
                    # Calculate confidence (percentage of nearby points with this classification)
                    confidence = (most_common_count / len(nearby_indices)) * 100
                    
                    logger.info(f"[CLASSIFICATION DEBUG] Point {i+1} area-based classification: code={classification_code}, desc='{classification_desc}', confidence={confidence:.1f}% ({most_common_count}/{len(nearby_indices)} points)")
                    successful_matches += 1
                else:
                    # No points within radius - find the nearest point as fallback
                    nearest_idx = np.argmin(distances)
                    min_distance = distances[nearest_idx]
                    
                    if min_distance < 50.0:  # 50m fallback tolerance
                        classification_code = int(original_classifications[nearest_idx].item())
                        classification_desc = self.CLASSIFICATION_MAP.get(
                            classification_code, 
                            f"Class {classification_code}"
                        )
                        logger.info(f"[CLASSIFICATION DEBUG] Point {i+1} fallback classification from nearest point at {min_distance:.1f}m: code={classification_code}, desc='{classification_desc}'")
                        successful_matches += 1
                    else:
                        logger.warning(f"[CLASSIFICATION DEBUG] Point {i+1} no classification possible - nearest point is {min_distance:.1f}m away")
            else:
                logger.warning(f"[CLASSIFICATION DEBUG] Point {i+1} no original data available for classification")
            
            # Convert to PNEZD format: Point, Northing, Easting, Elevation, Description
            pnezd_point = {
                "point": i + 1,  # 1-based indexing
                "northing": round(float(point[1]), 4),  # Y coordinate
                "easting": round(float(point[0]), 4),   # X coordinate  
                "elevation": round(float(point[2]), 4), # Z coordinate
                "description": classification_desc
            }
            points.append(pnezd_point)
        
        logger.info(f"[CLASSIFICATION DEBUG] Completed extraction: {successful_matches}/{num_points} points successfully classified")
        logger.info(f"[CLASSIFICATION DEBUG] Final preview points: {points}")
        return points

    async def _validate_blob_exists_with_retry(self, blob_name: str, max_retries: int = 3, retry_delay: int = 2) -> bool:
        """
        Validate that a blob exists in Azure storage with retry logic for eventual consistency
        
        Args:
            blob_name: Full blob path to validate
            max_retries: Maximum number of retry attempts
            retry_delay: Delay in seconds between retries
            
        Returns:
            True if blob exists, False otherwise
        """
        import asyncio
        
        for attempt in range(max_retries + 1):  # +1 for the initial attempt
            try:
                blob_exists = await self.storage_service.blob_exists(blob_name)
                if blob_exists:
                    if attempt > 0:
                        logger.info(f"Blob {blob_name} found on attempt {attempt + 1}")
                    return True
                else:
                    if attempt < max_retries:
                        logger.warning(f"Blob {blob_name} not found on attempt {attempt + 1}, retrying in {retry_delay}s...")
                        await asyncio.sleep(retry_delay)
                    else:
                        logger.error(f"Blob {blob_name} not found after {max_retries + 1} attempts")
                        
            except Exception as e:
                if attempt < max_retries:
                    logger.warning(f"Error checking blob {blob_name} on attempt {attempt + 1}: {str(e)}, retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error(f"Error checking blob {blob_name} after {max_retries + 1} attempts: {str(e)}")
        
        return False