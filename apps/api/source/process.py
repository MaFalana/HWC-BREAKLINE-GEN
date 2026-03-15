"""
LiDAR Surface Processing Backend
A modular, OOP-based library for processing LiDAR point clouds,
extracting breaklines, and generating DXF/CSV outputs.
"""

import logging
import os
import time
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np
import laspy
import ezdxf
import open3d as o3d
from scipy.spatial import Delaunay
from pyproj import Transformer
import csv
from pathlib import Path


@dataclass
class ProcessingParameters:
    """Parameters for LiDAR processing"""
    file_paths: List[str]
    voxel_size: int = 25
    threshold: float = 0.5
    nth_point: int = 1
    source_epsg: Optional[int] = None
    target_epsg: Optional[int] = None
    output_formats: List[str] = None
    output_dir: Optional[str] = None
    merge_outputs: bool = False
    merged_output_name: Optional[str] = None
    log_file: str = "lidar_processing.log"
    
    def __post_init__(self):
        if self.output_formats is None:
            self.output_formats = ['dxf']
        if self.output_dir is None:
            # Use the directory of the first file as default
            if self.file_paths:
                self.output_dir = str(Path(self.file_paths[0]).parent)
        if self.merge_outputs and not self.merged_output_name:
            self.merged_output_name = "merged_output"


@dataclass
class ProcessingResult:
    """Results from LiDAR processing"""
    file_path: str
    basename: str
    breaklines: List[List[Tuple[float, float, float]]]
    points: np.ndarray
    statistics: Dict[str, Any]
    output_files: Dict[str, str]
    processing_time: float
    success: bool
    error_message: Optional[str] = None


class LiDARProcessor:
    """Main class for processing LiDAR data"""
    
    def __init__(self, parameters: ProcessingParameters):
        """
        Initialize the LiDAR processor
        
        Args:
            parameters: ProcessingParameters object with all settings
        """
        self.params = parameters
        self.logger = self._setup_logging()
        self.results = []
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logging.basicConfig(
            filename=self.params.log_file,
            filemode='w',
            format='%(asctime)s - %(levelname)s - %(message)s',
            level=logging.INFO
        )
        return logging.getLogger(__name__)
    
    def process_files(self) -> List[ProcessingResult]:
        """
        Process all files specified in parameters
        
        Returns:
            List of ProcessingResult objects
        """
        self.logger.info(f"Starting processing of {len(self.params.file_paths)} files")
        start_time = time.time()
        
        for file_path in self.params.file_paths:
            result = self._process_single_file(file_path)
            self.results.append(result)
        
        # Merge outputs if requested and multiple files were processed successfully
        if self.params.merge_outputs and len(self.params.file_paths) > 1:
            successful_results = [r for r in self.results if r.success]
            if len(successful_results) > 1:
                merged_result = self._merge_results(successful_results)
                self.results.append(merged_result)
                self.logger.info(f"Merged {len(successful_results)} files into {self.params.merged_output_name}")
            
        total_time = time.time() - start_time
        self.logger.info(f"Total processing completed in {total_time/60:.2f} minutes")
        
        return self.results
    
    def _process_single_file(self, file_path: str) -> ProcessingResult:
        """Process a single LiDAR file"""
        start_time = time.time()
        basename = Path(file_path).stem # add time stamp to avoid overwriting
        basename = f"{basename}_{time.strftime('%Y%m%d_%H%M%S')}"
        
        self.logger.info(f"Processing file: {basename}")
        
        try:
            # Read and process point cloud
            las_data = self._read_point_cloud(file_path)
            
            # Filter and downsample points
            points = self._process_points(las_data)
            
            # Extract breaklines
            breaklines = self._extract_breaklines(points)
            
            # Apply reprojection if needed
            if self.params.source_epsg and self.params.target_epsg:
                points, breaklines = self._reproject_data(points, breaklines)
            
            # Generate statistics
            statistics = self._generate_statistics(points, breaklines, las_data)
            
            # Export files
            output_files = self._export_files(points, breaklines, basename)
            
            processing_time = time.time() - start_time
            
            self.logger.info(f"Successfully processed {basename} in {processing_time:.2f} seconds")
            
            return ProcessingResult(
                file_path=file_path,
                basename=basename,
                breaklines=breaklines,
                points=points,
                statistics=statistics,
                output_files=output_files,
                processing_time=processing_time,
                success=True
            )
            
        except Exception as e:
            self.logger.error(f"Error processing {basename}: {str(e)}")
            return ProcessingResult(
                file_path=file_path,
                basename=basename,
                breaklines=[],
                points=np.array([]),
                statistics={},
                output_files={},
                processing_time=time.time() - start_time,
                success=False,
                error_message=str(e)
            )
    
    def _read_point_cloud(self, file_path: str) -> Any:
        """Read LAS/LAZ file"""
        with laspy.open(file_path) as file:
            points = file.read()
            # Apply nth point sampling if specified
            if self.params.nth_point > 1:
                return points[::self.params.nth_point]
            return points
    
    def _process_points(self, las_data) -> np.ndarray:
        """Process and downsample points"""
        self.logger.info(f"Available classifications: {np.unique(las_data.classification)}")
        
        # Check if ground points (classification 2) exist
        if hasattr(las_data, 'classification') and 2 in las_data.classification:
            # Filter ground points
            ground_mask = las_data.classification == 2
            self.logger.info(f"Found {np.sum(ground_mask)} ground points")
            
            # Create point cloud
            xyz = np.vstack((
                las_data.x[ground_mask],
                las_data.y[ground_mask],
                las_data.z[ground_mask]
            )).T
            
            # Voxel downsampling using Open3D
            pcd = o3d.geometry.PointCloud()
            pcd.points = o3d.utility.Vector3dVector(xyz)
            
            self.logger.info(f"Before downsampling: {len(pcd.points)} points")
            
            downsampled = pcd.voxel_down_sample(self.params.voxel_size)
            points = np.asarray(downsampled.points)
            
            self.logger.info(f"After downsampling: {len(points)} points")
            
        else:
            # Use all points if no classification
            points = np.column_stack((las_data.x, las_data.y, las_data.z))
            self.logger.info(f"Using {len(points)} unclassified points")
            
        return points
    
    def _extract_breaklines(self, points: np.ndarray) -> List[List[Tuple[float, float, float]]]:
        """Extract breaklines based on elevation gradient"""
        if len(points) < 3:
            self.logger.warning("Not enough points for triangulation")
            return []
        
        # Delaunay triangulation
        tri = Delaunay(points[:, :2])
        self.logger.info(f"Created triangulation with {len(tri.simplices)} simplices")
        
        # Calculate gradients
        breaklines = []
        for simplex in tri.simplices:
            p1, p2, p3 = points[simplex]
            edges = [(p1, p2), (p2, p3), (p3, p1)]
            
            for p_start, p_end in edges:
                dx = p_end[0] - p_start[0]
                dy = p_end[1] - p_start[1]
                dz = p_end[2] - p_start[2]

                horizontal_dist = np.sqrt(dx**2 + dy**2)
                # Calculate gradient for all edges (matching Surface_Manager.py behavior)
                if horizontal_dist > 1:  # Only check for safe division
                    gradient = abs(dz / horizontal_dist)

                    if gradient > self.params.threshold:
                        # Additional length check to ensure meaningful breaklines
                        if np.linalg.norm(np.array(p_start) - np.array(p_end)) > 1:
                            breaklines.append([
                                tuple(p_start.tolist()),
                                tuple(p_end.tolist())
                            ])
        
        self.logger.info(f"Extracted {len(breaklines)} breaklines")
        return breaklines
    
    def _reproject_data(self, points: np.ndarray, 
                       breaklines: List) -> Tuple[np.ndarray, List]:
        """Reproject points and breaklines to target coordinate system"""
        transformer = Transformer.from_crs(
            self.params.source_epsg,
            self.params.target_epsg,
            always_xy=True
        )
        
        # Reproject points
        x_new, y_new = transformer.transform(points[:, 0], points[:, 1])
        reprojected_points = np.column_stack((x_new, y_new, points[:, 2]))
        
        # Reproject breaklines
        reprojected_breaklines = []
        for line in breaklines:
            transformed_line = []
            for x, y, z in line:
                x_new, y_new = transformer.transform(x, y)
                transformed_line.append((x_new, y_new, z))
            reprojected_breaklines.append(transformed_line)
        
        self.logger.info(f"Reprojected from EPSG:{self.params.source_epsg} to EPSG:{self.params.target_epsg}")
        
        return reprojected_points, reprojected_breaklines
    
    def _generate_statistics(self, points: np.ndarray, 
                           breaklines: List, las_data) -> Dict[str, Any]:
        """Generate statistics including five-number summary"""
        stats = {}
        
        if len(points) > 0:
            # Five-number summary for elevations
            elevations = points[:, 2]
            stats['elevation_summary'] = {
                'min': float(np.min(elevations)),
                'q1': float(np.percentile(elevations, 25)),
                'median': float(np.median(elevations)),
                'q3': float(np.percentile(elevations, 75)),
                'max': float(np.max(elevations)),
                'mean': float(np.mean(elevations)),
                'std': float(np.std(elevations))
            }
            
            # Point statistics
            stats['point_count'] = {
                'original': len(las_data.x) if hasattr(las_data, 'x') else 0,
                'ground': np.sum(las_data.classification == 2) if hasattr(las_data, 'classification') else 0,
                'downsampled': len(points)
            }
            
            # Breakline statistics
            stats['breakline_count'] = len(breaklines)
            
            # Bounding box
            stats['bounding_box'] = {
                'min_x': float(np.min(points[:, 0])),
                'max_x': float(np.max(points[:, 0])),
                'min_y': float(np.min(points[:, 1])),
                'max_y': float(np.max(points[:, 1])),
                'min_z': float(np.min(points[:, 2])),
                'max_z': float(np.max(points[:, 2]))
            }
            
            # Classification distribution if available
            if hasattr(las_data, 'classification'):
                unique, counts = np.unique(np.array(las_data.classification), return_counts=True)
                stats['classifications'] = dict(zip(unique.tolist(), counts.tolist()))
        
        return stats
    
    def _export_files(self, points: np.ndarray, 
                     breaklines: List, basename: str) -> Dict[str, str]:
        """Export to DXF, CSV, and preview formats"""
        output_files = {}
        output_dir = Path(self.params.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        if 'dxf' in self.params.output_formats:
            dxf_path = self._export_dxf(points, breaklines, basename, output_dir)
            output_files['dxf'] = str(dxf_path)

        if 'csv' in self.params.output_formats:
            csv_path = self._export_csv(points, basename, output_dir)
            output_files['csv'] = str(csv_path)

        # Always generate a preview file
        preview_path = self._export_preview(points, basename, output_dir)
        output_files['preview'] = str(preview_path)

        return output_files
    
    def _export_dxf(self, points: np.ndarray, breaklines: List, 
                   basename: str, output_dir: Path) -> Path:
        """Export to DXF format"""
        doc = ezdxf.new(setup=True)
        doc.header['$INSUNITS'] = 6  # US Survey Feet
        msp = doc.modelspace()
        
        # Add breaklines as 3D polylines
        for breakline in breaklines:
            points_3d = [(x, y, z) for x, y, z in breakline]
            msp.add_polyline3d(points_3d, dxfattribs={'layer': 'Breaklines'})
        
        # Add points
        for x, y, z in points:
            msp.add_point((x, y, z), dxfattribs={'layer': 'Points'})
        
        # Save file
        suffix = "_reprojected" if self.params.target_epsg else ""
        dxf_path = output_dir / f"{basename}{suffix}.dxf"
        doc.saveas(str(dxf_path))
        
        self.logger.info(f"Saved DXF file: {dxf_path}")
        return dxf_path
    
    def _export_csv(self, points: np.ndarray, basename: str, 
                   output_dir: Path) -> Path:
        """Export to CSV format (PNEZD)"""
        suffix = "_reprojected" if self.params.target_epsg else ""
        csv_path = output_dir / f"{basename}{suffix}.csv"
        
        with open(csv_path, 'w', newline='') as file:
            writer = csv.writer(file)
            # Write header
            writer.writerow(['Point', 'Northing', 'Easting', 'Elevation', 'Description'])
            # Write points
            for i, (x, y, z) in enumerate(points, 1):
                writer.writerow([i, y, x, z, 'LIDAR'])
        
        self.logger.info(f"Saved CSV file: {csv_path}")
        return csv_path
    def _export_preview(self, points: np.ndarray, basename: str,
                        output_dir: Path, max_points: int = 50) -> Path:
        """Export a lightweight preview CSV with the first N processed points in PNEZD format.

        The file is always generated regardless of user-selected output formats
        so the API can serve preview data without touching MongoDB or the
        original LAS file.
        """
        preview_path = output_dir / f"{basename}_preview.csv"
        num_points = min(len(points), max_points)

        with open(preview_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Point', 'Northing', 'Easting', 'Elevation', 'Description'])
            for i in range(num_points):
                x, y, z = points[i]
                writer.writerow([i + 1, round(float(y), 4), round(float(x), 4),
                                 round(float(z), 4), 'Ground'])

        self.logger.info(f"Saved preview CSV ({num_points} points): {preview_path}")
        return preview_path
    
    def _merge_results(self, results: List[ProcessingResult]) -> ProcessingResult:
        """
        Merge multiple processing results into a single result
        
        Args:
            results: List of successful ProcessingResult objects to merge
            
        Returns:
            Merged ProcessingResult
        """
        start_time = time.time()
        self.logger.info(f"Merging {len(results)} results")
        
        try:
            # Merge all points
            all_points = []
            all_breaklines = []
            
            for result in results:
                if len(result.points) > 0:
                    all_points.append(result.points)
                all_breaklines.extend(result.breaklines)
            
            # Combine points into single array
            if all_points:
                merged_points = np.vstack(all_points)
            else:
                merged_points = np.array([])
            
            # Remove duplicate points (based on spatial proximity)
            if len(merged_points) > 0:
                merged_points = self._remove_duplicate_points(merged_points)
            
            # Remove duplicate breaklines
            merged_breaklines = self._remove_duplicate_breaklines(all_breaklines)
            
            self.logger.info(f"Merged: {len(merged_points)} points, {len(merged_breaklines)} breaklines")
            
            # Generate merged statistics
            merged_stats = self._generate_merged_statistics(merged_points, merged_breaklines, results)
            
            # Export merged files
            output_files = self._export_files(
                merged_points, 
                merged_breaklines, 
                self.params.merged_output_name
            )
            
            processing_time = time.time() - start_time
            
            return ProcessingResult(
                file_path="MERGED",
                basename=self.params.merged_output_name,
                breaklines=merged_breaklines,
                points=merged_points,
                statistics=merged_stats,
                output_files=output_files,
                processing_time=processing_time,
                success=True
            )
            
        except Exception as e:
            self.logger.error(f"Error merging results: {str(e)}")
            return ProcessingResult(
                file_path="MERGED",
                basename=self.params.merged_output_name,
                breaklines=[],
                points=np.array([]),
                statistics={},
                output_files={},
                processing_time=time.time() - start_time,
                success=False,
                error_message=str(e)
            )
    
    def _remove_duplicate_points(self, points: np.ndarray, tolerance: float = 0.01) -> np.ndarray:
        """
        Remove duplicate points within tolerance distance
        
        Args:
            points: Array of points (N, 3)
            tolerance: Distance tolerance for considering points as duplicates
            
        Returns:
            Array with duplicate points removed
        """
        if len(points) == 0:
            return points
            
        # Use Open3D for efficient duplicate removal
        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(points)
        
        # Remove duplicates
        pcd = pcd.remove_duplicated_points()
        
        # Additional voxel-based cleanup if needed
        if tolerance > 0:
            pcd = pcd.voxel_down_sample(tolerance)
        
        return np.asarray(pcd.points)
    
    def _remove_duplicate_breaklines(self, breaklines: List) -> List:
        """
        Remove duplicate breaklines
        
        Args:
            breaklines: List of breaklines
            
        Returns:
            List with duplicate breaklines removed
        """
        unique_breaklines = []
        seen = set()
        
        for line in breaklines:
            if len(line) >= 2:
                # Create a hashable representation of the line
                # Sort points to handle reversed duplicates
                line_tuple = tuple(sorted([tuple(p) for p in line]))
                
                if line_tuple not in seen:
                    seen.add(line_tuple)
                    unique_breaklines.append(line)
        
        return unique_breaklines
    
    def _generate_merged_statistics(self, points: np.ndarray, 
                                   breaklines: List,
                                   source_results: List[ProcessingResult]) -> Dict[str, Any]:
        """
        Generate statistics for merged results
        
        Args:
            points: Merged points array
            breaklines: Merged breaklines list
            source_results: Original results that were merged
            
        Returns:
            Dictionary of merged statistics
        """
        stats = {}
        
        # Source files information
        stats['source_files'] = [r.basename for r in source_results]
        stats['file_count'] = len(source_results)
        
        if len(points) > 0:
            # Five-number summary for elevations
            elevations = points[:, 2]
            stats['elevation_summary'] = {
                'min': float(np.min(elevations)),
                'q1': float(np.percentile(elevations, 25)),
                'median': float(np.median(elevations)),
                'q3': float(np.percentile(elevations, 75)),
                'max': float(np.max(elevations)),
                'mean': float(np.mean(elevations)),
                'std': float(np.std(elevations))
            }
            
            # Merged point statistics
            stats['point_count'] = {
                'total_original': sum(r.statistics.get('point_count', {}).get('original', 0) 
                                    for r in source_results),
                'total_ground': sum(r.statistics.get('point_count', {}).get('ground', 0) 
                                  for r in source_results),
                'merged_final': len(points)
            }
            
            # Breakline statistics
            stats['breakline_count'] = {
                'total_original': sum(r.statistics.get('breakline_count', 0) 
                                    for r in source_results),
                'merged_final': len(breaklines)
            }
            
            # Combined bounding box
            stats['bounding_box'] = {
                'min_x': float(np.min(points[:, 0])),
                'max_x': float(np.max(points[:, 0])),
                'min_y': float(np.min(points[:, 1])),
                'max_y': float(np.max(points[:, 1])),
                'min_z': float(np.min(points[:, 2])),
                'max_z': float(np.max(points[:, 2]))
            }
            
            # Merged area
            area = (stats['bounding_box']['max_x'] - stats['bounding_box']['min_x']) * \
                   (stats['bounding_box']['max_y'] - stats['bounding_box']['min_y'])
            stats['coverage_area'] = float(area)
            
            # Combined classification distribution
            all_classifications = {}
            for result in source_results:
                if 'classifications' in result.statistics:
                    for class_id, count in result.statistics['classifications'].items():
                        all_classifications[class_id] = all_classifications.get(class_id, 0) + count
            
            if all_classifications:
                stats['classifications'] = all_classifications
        
        return stats