"""
Preview service for LiDAR data analysis
"""

import time
import csv
import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
import laspy
import tempfile
from pathlib import Path

from app.models.preview import (
    PNEZDPoint, ElevationStatistics, BoundingBox, 
    SpatialCoverage, ClassificationCount, DataQuality,
    FileMetadata, JobPreviewResponse, FilePreview, 
    MultiFilePreviewResponse
)
from app.services.storage import StorageService
from app.utils.exceptions import ProcessingException


logger = logging.getLogger(__name__)

# LAS classification codes to names
CLASSIFICATION_NAMES = {
    0: "Never Classified",
    1: "Unassigned",
    2: "Ground",
    3: "Low Vegetation",
    4: "Medium Vegetation",
    5: "High Vegetation",
    6: "Building",
    7: "Low Point (Noise)",
    8: "Model Key-point",
    9: "Water",
    10: "Rail",
    11: "Road Surface",
    12: "Bridge Deck",
    13: "Wire - Guard",
    14: "Wire - Conductor",
    15: "Transmission Tower",
    16: "Wire - Connector",
    17: "Bridge",
    18: "High Noise"
}


class PreviewService:
    """Service for generating LiDAR data previews"""
    
    def __init__(self):
        self.storage_service = StorageService()
        self.logger = logger
    
    async def generate_preview(self, job_id: str, input_file_blob: str) -> JobPreviewResponse:
        """
        Generate preview data for a LAS/LAZ file
        
        Args:
            job_id: Job identifier
            input_file_blob: Blob path to input file
            
        Returns:
            JobPreviewResponse with preview data
        """
        start_time = time.time()
        
        try:
            # Fix: Handle both full blob paths and just filenames
            # If input_file_blob doesn't contain '/', it's just a filename and needs the full path
            if '/' not in input_file_blob:
                # Construct full blob path: jobs/job_id/input/filename
                full_blob_path = f"jobs/{job_id}/input/{input_file_blob}"
                self.logger.info(f"Converting filename '{input_file_blob}' to full blob path: {full_blob_path}")
            else:
                full_blob_path = input_file_blob
            
            # Download file to temp location
            with tempfile.NamedTemporaryFile(suffix=Path(full_blob_path).suffix, delete=False) as tmp_file:
                file_data = await self.storage_service.download_file(full_blob_path)
                tmp_file.write(file_data)
                tmp_path = tmp_file.name
            
            try:
                # Read LAS/LAZ file
                with laspy.open(tmp_path) as las_file:
                    header = las_file.header
                    las_data = las_file.read()
                    
                    # Extract data
                    preview_points = self._extract_preview_points(las_data)
                    elevation_stats = self._calculate_elevation_statistics(las_data)
                    spatial_coverage = self._calculate_spatial_coverage(las_data, header)
                    data_quality = self._analyze_data_quality(las_data)
                    file_metadata = self._extract_file_metadata(full_blob_path, header)
                    
                    processing_time = (time.time() - start_time) * 1000  # Convert to ms
                    
                    return JobPreviewResponse(
                        job_id=job_id,
                        preview_points=preview_points,
                        elevation_statistics=elevation_stats,
                        spatial_coverage=spatial_coverage,
                        data_quality=data_quality,
                        file_metadata=file_metadata,
                        processing_time_ms=processing_time
                    )
                    
            finally:
                # Clean up temp file
                Path(tmp_path).unlink(missing_ok=True)
                
        except Exception as e:
            self.logger.error(f"Failed to generate preview for job {job_id}: {str(e)}")
            raise ProcessingException(job_id, str(e))
    
    def _extract_preview_points(self, las_data, max_points: int = 50) -> List[PNEZDPoint]:
        """Extract first N points in PNEZD format"""
        points = []
        
        # Convert to numpy arrays to avoid SubFieldView issues
        x_coords = np.array(las_data.x)
        y_coords = np.array(las_data.y)
        z_coords = np.array(las_data.z)
        classifications = np.array(las_data.classification) if hasattr(las_data, 'classification') else None
        
        # Determine how many points to extract
        num_points = min(len(x_coords), max_points)
        
        for i in range(num_points):
            # Get classification name
            class_code = int(classifications[i].item()) if classifications is not None else 0
            class_name = CLASSIFICATION_NAMES.get(class_code, f"Class {class_code}")
            
            # Create PNEZD point (note: LAS uses X=Easting, Y=Northing)
            point = PNEZDPoint(
                point=i + 1,  # 1-based indexing
                northing=round(float(y_coords[i]), 4),
                easting=round(float(x_coords[i]), 4),
                elevation=round(float(z_coords[i]), 4),
                description=class_name
            )
            points.append(point)
        
        return points
    
    def _calculate_elevation_statistics(self, las_data) -> ElevationStatistics:
        """Calculate comprehensive elevation statistics"""
        z_values = np.array(las_data.z)  # Convert SubFieldView to numpy array
        
        # Calculate five-number summary
        min_z = float(np.min(z_values))
        max_z = float(np.max(z_values))
        q1 = float(np.percentile(z_values, 25))
        median = float(np.percentile(z_values, 50))
        q3 = float(np.percentile(z_values, 75))
        
        # Additional statistics
        mean = float(np.mean(z_values))
        std_dev = float(np.std(z_values))
        variance = float(np.var(z_values))
        range_z = max_z - min_z
        iqr = q3 - q1
        
        return ElevationStatistics(
            min=round(min_z, 4),
            q1=round(q1, 4),
            median=round(median, 4),
            q3=round(q3, 4),
            max=round(max_z, 4),
            mean=round(mean, 4),
            std_dev=round(std_dev, 4),
            variance=round(variance, 4),
            range=round(range_z, 4),
            iqr=round(iqr, 4)
        )
    
    def _calculate_spatial_coverage(self, las_data, header) -> SpatialCoverage:
        """Calculate spatial coverage information"""
        # Convert coordinates to numpy arrays
        x_values = np.array(las_data.x)
        y_values = np.array(las_data.y)
        z_values = np.array(las_data.z)
        
        # Get bounds
        min_x, max_x = float(np.min(x_values)), float(np.max(x_values))
        min_y, max_y = float(np.min(y_values)), float(np.max(y_values))
        min_z, max_z = float(np.min(z_values)), float(np.max(z_values))
        
        # Calculate area
        width = max_x - min_x
        height = max_y - min_y
        area_sq_meters = width * height
        area_acres = area_sq_meters / 4046.86  # 1 acre = 4046.86 sq meters
        area_hectares = area_sq_meters / 10000  # 1 hectare = 10000 sq meters
        
        # Calculate point density
        total_points = len(las_data)
        point_density = total_points / area_sq_meters if area_sq_meters > 0 else 0
        
        # Try to get coordinate system
        coord_system = None
        if hasattr(header, 'global_encoding') and hasattr(header, 'vlrs'):
            # Look for CRS info in VLRs (Variable Length Records)
            for vlr in header.vlrs:
                if vlr.record_id == 34735:  # GeoTIFF key
                    coord_system = "Check VLRs for EPSG"
                    break
        
        bounding_box = BoundingBox(
            min_northing=round(min_y, 4),
            max_northing=round(max_y, 4),
            min_easting=round(min_x, 4),
            max_easting=round(max_x, 4),
            min_elevation=round(min_z, 4),
            max_elevation=round(max_z, 4)
        )
        
        return SpatialCoverage(
            bounding_box=bounding_box,
            area_sq_meters=round(area_sq_meters, 2),
            area_acres=round(area_acres, 2),
            area_hectares=round(area_hectares, 2),
            point_density=round(point_density, 2),
            coordinate_system=coord_system
        )
    
    def _analyze_data_quality(self, las_data) -> DataQuality:
        """Analyze data quality metrics"""
        total_points = len(las_data)
        
        # Classification breakdown
        classifications = []
        if hasattr(las_data, 'classification'):
            class_data = np.array(las_data.classification)
            unique_classes, counts = np.unique(class_data, return_counts=True)
            for class_code, count in zip(unique_classes, counts):
                class_name = CLASSIFICATION_NAMES.get(class_code, f"Class {class_code}")
                percentage = (count / total_points) * 100
                classifications.append(
                    ClassificationCount(
                        code=int(class_code),
                        name=class_name,
                        count=int(count),
                        percentage=round(percentage, 2)
                    )
                )
        
        # Return types (if available)
        return_types = None
        if hasattr(las_data, 'return_number') and hasattr(las_data, 'number_of_returns'):
            return_nums = np.array(las_data.return_number)
            num_returns = np.array(las_data.number_of_returns)
            return_types = {
                "single": int(np.sum((return_nums == 1) & (num_returns == 1))),
                "first": int(np.sum((return_nums == 1) & (num_returns > 1))),
                "last": int(np.sum(return_nums == num_returns)),
                "intermediate": int(np.sum((return_nums > 1) & (return_nums < num_returns)))
            }
        
        # GPS time range (if available)
        gps_time_range = None
        if hasattr(las_data, 'gps_time') and len(las_data.gps_time) > 0:
            gps_times = np.array(las_data.gps_time)
            gps_time_range = {
                "min": float(np.min(gps_times)),
                "max": float(np.max(gps_times)),
                "range_seconds": float(np.max(gps_times) - np.min(gps_times))
            }
        
        # Intensity statistics (if available)
        intensity_stats = None
        if hasattr(las_data, 'intensity') and len(las_data.intensity) > 0:
            intensities = np.array(las_data.intensity)
            intensity_stats = {
                "min": float(np.min(intensities)),
                "max": float(np.max(intensities)),
                "mean": round(float(np.mean(intensities)), 2),
                "std_dev": round(float(np.std(intensities)), 2)
            }
        
        return DataQuality(
            total_points=total_points,
            classifications=classifications,
            return_types=return_types,
            gps_time_range=gps_time_range,
            intensity_stats=intensity_stats
        )
    
    def _extract_file_metadata(self, blob_name: str, header) -> FileMetadata:
        """Extract file metadata"""
        filename = Path(blob_name).name
        
        # Get file size (approximate from point count and format)
        point_size = header.point_format.size
        file_size_bytes = header.point_count * point_size
        file_size_mb = file_size_bytes / (1024 * 1024)
        
        # LAS version
        las_version = f"{header.version.major}.{header.version.minor}"
        
        # Creation date
        creation_date = None
        if hasattr(header, 'creation_date'):
            try:
                # LAS stores date as (year, day_of_year)
                year = header.creation_date.year
                day = header.creation_date.day
                if year and day:
                    from datetime import datetime, timedelta
                    creation_date = datetime(year, 1, 1) + timedelta(days=day - 1)
            except:
                pass
        
        # Software info
        generating_software = None
        if hasattr(header, 'generating_software'):
            generating_software = header.generating_software.strip('\x00')
        
        system_id = None
        if hasattr(header, 'system_identifier'):
            system_id = header.system_identifier.strip('\x00')
        
        return FileMetadata(
            filename=filename,
            file_size_mb=round(file_size_mb, 2),
            las_version=las_version,
            point_data_format=header.point_format.id,
            creation_date=creation_date,
            generating_software=generating_software,
            system_identifier=system_id
        )
    
    async def generate_multi_file_preview(
        self, 
        job_id: str, 
        input_file_blobs: List[str],
        is_merge_job: bool = False
    ) -> MultiFilePreviewResponse:
        """
        Generate preview for multiple files
        
        Args:
            job_id: Job identifier
            input_file_blobs: List of blob paths to input files
            is_merge_job: Whether this job will merge outputs
            
        Returns:
            MultiFilePreviewResponse with individual or merged preview
        """
        start_time = time.time()
        
        try:
            if is_merge_job:
                # For merge jobs, create a merged preview
                merged_preview = await self._generate_merged_preview(input_file_blobs, job_id)
                processing_time = (time.time() - start_time) * 1000
                
                return MultiFilePreviewResponse(
                    job_id=job_id,
                    is_merge_job=True,
                    file_count=len(input_file_blobs),
                    file_previews=[],  # Empty for merge jobs
                    merged_preview=merged_preview,
                    processing_time_ms=processing_time
                )
            else:
                # For non-merge jobs, generate individual previews
                file_previews = []
                for blob_path in input_file_blobs:
                    preview = await self._generate_single_file_preview(blob_path, job_id)
                    file_previews.append(preview)
                
                processing_time = (time.time() - start_time) * 1000
                
                return MultiFilePreviewResponse(
                    job_id=job_id,
                    is_merge_job=False,
                    file_count=len(input_file_blobs),
                    file_previews=file_previews,
                    merged_preview=None,
                    processing_time_ms=processing_time
                )
                
        except Exception as e:
            self.logger.error(f"Failed to generate multi-file preview for job {job_id}: {str(e)}")
            raise ProcessingException(job_id, str(e))
    
    async def _generate_single_file_preview(self, blob_path: str, job_id: str = None) -> FilePreview:
        """Generate preview for a single file"""
        # Fix: Handle both full blob paths and just filenames
        if '/' not in blob_path and job_id:
            full_blob_path = f"jobs/{job_id}/input/{blob_path}"
            self.logger.info(f"Converting filename '{blob_path}' to full blob path: {full_blob_path}")
        else:
            full_blob_path = blob_path
        
        # Download file to temp location
        with tempfile.NamedTemporaryFile(suffix=Path(full_blob_path).suffix, delete=False) as tmp_file:
            file_data = await self.storage_service.download_file(full_blob_path)
            tmp_file.write(file_data)
            tmp_path = tmp_file.name
        
        try:
            # Read LAS/LAZ file
            with laspy.open(tmp_path) as las_file:
                header = las_file.header
                las_data = las_file.read()
                
                # Extract data
                preview_points = self._extract_preview_points(las_data)
                elevation_stats = self._calculate_elevation_statistics(las_data)
                spatial_coverage = self._calculate_spatial_coverage(las_data, header)
                data_quality = self._analyze_data_quality(las_data)
                file_metadata = self._extract_file_metadata(full_blob_path, header)
                
                return FilePreview(
                    preview_points=preview_points,
                    elevation_statistics=elevation_stats,
                    spatial_coverage=spatial_coverage,
                    data_quality=data_quality,
                    file_metadata=file_metadata
                )
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
    
    async def _generate_merged_preview(self, blob_paths: List[str], job_id: str) -> FilePreview:
        """Generate preview for merged data from multiple files"""
        # For efficiency, we'll aggregate data without actually merging
        all_points = []
        all_z_values = []
        all_x_values = []
        all_y_values = []
        total_points = 0
        classification_counts = {}
        
        # Process each file
        for blob_path in blob_paths:
            # Fix: Handle both full blob paths and just filenames
            if '/' not in blob_path:
                full_blob_path = f"jobs/{job_id}/input/{blob_path}"
                self.logger.info(f"Converting filename '{blob_path}' to full blob path: {full_blob_path}")
            else:
                full_blob_path = blob_path
            
            with tempfile.NamedTemporaryFile(suffix=Path(full_blob_path).suffix, delete=False) as tmp_file:
                file_data = await self.storage_service.download_file(full_blob_path)
                tmp_file.write(file_data)
                tmp_path = tmp_file.name
            
            try:
                with laspy.open(tmp_path) as las_file:
                    las_data = las_file.read()
                    
                    # Collect coordinate data
                    x_vals = np.array(las_data.x)
                    y_vals = np.array(las_data.y)
                    z_vals = np.array(las_data.z)
                    
                    all_x_values.extend(x_vals)
                    all_y_values.extend(y_vals)
                    all_z_values.extend(z_vals)
                    
                    # Sample points from this file (proportionally)
                    # Simple approach: take equal samples from each file
                    points_per_file = max(1, 50 // len(blob_paths))
                    remaining_points = 50 - len(all_points)
                    points_to_sample = min(points_per_file, remaining_points)
                    
                    if len(all_points) < 50:
                        sample_indices = np.linspace(0, len(x_vals)-1, min(points_to_sample, len(x_vals)), dtype=int)
                        for idx in sample_indices:
                            if len(all_points) < 50:
                                classifications = np.array(las_data.classification) if hasattr(las_data, 'classification') else None
                                class_code = int(classifications[idx].item()) if classifications is not None else 0
                                class_name = CLASSIFICATION_NAMES.get(class_code, f"Class {class_code}")
                                
                                all_points.append(PNEZDPoint(
                                    point=len(all_points) + 1,
                                    northing=round(float(y_vals[idx]), 4),
                                    easting=round(float(x_vals[idx]), 4),
                                    elevation=round(float(z_vals[idx]), 4),
                                    description=class_name
                                ))
                    
                    # Aggregate classification counts
                    if hasattr(las_data, 'classification'):
                        class_data = np.array(las_data.classification)
                        unique_classes, counts = np.unique(class_data, return_counts=True)
                        for class_code, count in zip(unique_classes, counts):
                            classification_counts[class_code] = classification_counts.get(class_code, 0) + count
                    
                    total_points += len(las_data)
                    
            finally:
                Path(tmp_path).unlink(missing_ok=True)
        
        # Convert to numpy arrays
        all_x_values = np.array(all_x_values)
        all_y_values = np.array(all_y_values)
        all_z_values = np.array(all_z_values)
        
        # Calculate merged statistics
        elevation_stats = ElevationStatistics(
            min=round(float(np.min(all_z_values)), 4),
            q1=round(float(np.percentile(all_z_values, 25)), 4),
            median=round(float(np.percentile(all_z_values, 50)), 4),
            q3=round(float(np.percentile(all_z_values, 75)), 4),
            max=round(float(np.max(all_z_values)), 4),
            mean=round(float(np.mean(all_z_values)), 4),
            std_dev=round(float(np.std(all_z_values)), 4),
            variance=round(float(np.var(all_z_values)), 4),
            range=round(float(np.max(all_z_values) - np.min(all_z_values)), 4),
            iqr=round(float(np.percentile(all_z_values, 75) - np.percentile(all_z_values, 25)), 4)
        )
        
        # Calculate merged spatial coverage
        min_x, max_x = float(np.min(all_x_values)), float(np.max(all_x_values))
        min_y, max_y = float(np.min(all_y_values)), float(np.max(all_y_values))
        min_z, max_z = float(np.min(all_z_values)), float(np.max(all_z_values))
        
        width = max_x - min_x
        height = max_y - min_y
        area_sq_meters = width * height
        area_acres = area_sq_meters / 4046.86
        area_hectares = area_sq_meters / 10000
        point_density = total_points / area_sq_meters if area_sq_meters > 0 else 0
        
        spatial_coverage = SpatialCoverage(
            bounding_box=BoundingBox(
                min_northing=round(min_y, 4),
                max_northing=round(max_y, 4),
                min_easting=round(min_x, 4),
                max_easting=round(max_x, 4),
                min_elevation=round(min_z, 4),
                max_elevation=round(max_z, 4)
            ),
            area_sq_meters=round(area_sq_meters, 2),
            area_acres=round(area_acres, 2),
            area_hectares=round(area_hectares, 2),
            point_density=round(point_density, 2),
            coordinate_system=None  # Would need to check if all files have same CRS
        )
        
        # Build classification data
        classifications = []
        for class_code, count in classification_counts.items():
            class_name = CLASSIFICATION_NAMES.get(class_code, f"Class {class_code}")
            percentage = (count / total_points) * 100
            classifications.append(
                ClassificationCount(
                    code=int(class_code),
                    name=class_name,
                    count=int(count),
                    percentage=round(percentage, 2)
                )
            )
        
        data_quality = DataQuality(
            total_points=total_points,
            classifications=classifications,
            return_types=None,  # Would need to aggregate
            gps_time_range=None,  # Would need to aggregate
            intensity_stats=None  # Would need to aggregate
        )
        
        # Create merged file metadata
        # Estimate file size from point count (approximate)
        estimated_size_mb = (total_points * 34) / (1024 * 1024)  # ~34 bytes per point average
        
        file_metadata = FileMetadata(
            filename=f"merged_{len(blob_paths)}_files",
            file_size_mb=round(estimated_size_mb, 2),
            las_version="Mixed" if len(blob_paths) > 1 else None,
            point_data_format=None,
            creation_date=None,
            generating_software="Surface Generation API - Merged Preview",
            system_identifier=None
        )
        
        return FilePreview(
            preview_points=all_points[:50],  # Limit to 50
            elevation_statistics=elevation_stats,
            spatial_coverage=spatial_coverage,
            data_quality=data_quality,
            file_metadata=file_metadata
        )

    # ------------------------------------------------------------------
    # Completed-job preview (from preview CSV files in blob storage)
    # ------------------------------------------------------------------

    async def build_preview_from_outputs(self, job) -> JobPreviewResponse | MultiFilePreviewResponse:
        """Build a preview response by downloading and parsing preview CSVs
        that were generated during processing.

        Falls back to the live LAS-based preview if no preview CSV is found.
        """
        from app.models.job import Job  # avoid circular at module level

        preview_blobs = [b for b in job.output_files if b.endswith("_preview.csv")]

        if not preview_blobs:
            # No preview CSV was generated (legacy job) — fall back to live preview
            self.logger.info(f"No preview CSV found for job {job.id}, falling back to live preview")
            if len(job.input_files) == 1:
                return await self.generate_preview(job.id, job.input_files[0])
            else:
                is_merge = job.processing_parameters.get("merge_outputs", False)
                return await self.generate_multi_file_preview(job.id, job.input_files, is_merge)

        # Parse each preview CSV into a FilePreview
        file_previews: list[FilePreview] = []
        for blob_name in preview_blobs:
            file_preview = await self._parse_preview_csv(blob_name)
            file_previews.append(file_preview)

        total_points = job.total_processed_points or 0

        if len(file_previews) == 1:
            fp = file_previews[0]
            return JobPreviewResponse(
                job_id=job.id,
                preview_points=fp.preview_points,
                elevation_statistics=fp.elevation_statistics,
                spatial_coverage=fp.spatial_coverage,
                data_quality=fp.data_quality,
                file_metadata=fp.file_metadata,
                processing_time_ms=0.0,
                total_processed_points=total_points,
            )
        else:
            is_merge = job.processing_parameters.get("merge_outputs", False)
            return MultiFilePreviewResponse(
                job_id=job.id,
                is_merge_job=is_merge,
                file_count=len(file_previews),
                file_previews=file_previews if not is_merge else [],
                merged_preview=file_previews[0] if is_merge else None,
                processing_time_ms=0.0,
                total_processed_points=total_points,
            )

    async def _parse_preview_csv(self, blob_name: str) -> FilePreview:
        """Download a preview CSV from blob storage and convert to FilePreview."""
        raw = await self.storage_service.download_file(blob_name)
        text = raw.decode("utf-8")
        reader = csv.DictReader(text.splitlines())

        points: list[PNEZDPoint] = []
        for row in reader:
            points.append(PNEZDPoint(
                point=int(row["Point"]),
                northing=float(row["Northing"]),
                easting=float(row["Easting"]),
                elevation=float(row["Elevation"]),
                description=row["Description"],
            ))

        # Derive basic stats from the preview points
        if points:
            elevations = [p.elevation for p in points]
            northings = [p.northing for p in points]
            eastings = [p.easting for p in points]
            sorted_e = sorted(elevations)
            n = len(sorted_e)

            elevation_stats = ElevationStatistics(
                min=sorted_e[0],
                q1=sorted_e[n // 4] if n > 4 else sorted_e[0],
                median=sorted_e[n // 2],
                q3=sorted_e[3 * n // 4] if n > 4 else sorted_e[-1],
                max=sorted_e[-1],
                mean=round(sum(elevations) / n, 4),
                std_dev=round(float(np.std(elevations)), 4),
                variance=round(float(np.var(elevations)), 4),
                range=round(sorted_e[-1] - sorted_e[0], 4),
                iqr=round(
                    (sorted_e[3 * n // 4] if n > 4 else sorted_e[-1])
                    - (sorted_e[n // 4] if n > 4 else sorted_e[0]),
                    4,
                ),
            )
            spatial_coverage = SpatialCoverage(
                bounding_box=BoundingBox(
                    min_northing=min(northings),
                    max_northing=max(northings),
                    min_easting=min(eastings),
                    max_easting=max(eastings),
                    min_elevation=sorted_e[0],
                    max_elevation=sorted_e[-1],
                ),
                area_sq_meters=0.0,
                area_acres=0.0,
                area_hectares=0.0,
                point_density=0.0,
                coordinate_system="Processed",
            )
        else:
            elevation_stats = ElevationStatistics(
                min=0, q1=0, median=0, q3=0, max=0,
                mean=0, std_dev=0, variance=0, range=0, iqr=0,
            )
            spatial_coverage = SpatialCoverage(
                bounding_box=BoundingBox(
                    min_northing=0, max_northing=0, min_easting=0,
                    max_easting=0, min_elevation=0, max_elevation=0,
                ),
                area_sq_meters=0, area_acres=0, area_hectares=0,
                point_density=0, coordinate_system="Processed",
            )

        filename = Path(blob_name).name
        return FilePreview(
            preview_points=points,
            elevation_statistics=elevation_stats,
            spatial_coverage=spatial_coverage,
            data_quality=DataQuality(
                total_points=len(points),
                classifications=[],
                return_types=None,
                gps_time_range=None,
                intensity_stats=None,
            ),
            file_metadata=FileMetadata(
                filename=filename,
                file_size_mb=0,
                las_version="Processed",
                point_data_format=0,
                creation_date=None,
                generating_software="Surface Generation API",
                system_identifier=None,
            ),
        )
