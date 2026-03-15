"""
Example usage of the LiDAR Processing Backend
Demonstrates various use cases and configurations
"""

from process import LiDARProcessor, ProcessingParameters
import json
from pathlib import Path


def example_basic_processing():
    """Basic example: Process single file with default settings"""
    print("\n=== Basic Processing Example ===")
    
    # Define parameters
    params = ProcessingParameters(
        file_paths=['path/to/your/file.laz'],
        voxel_size=25,
        threshold=0.5,
        output_formats=['dxf', 'csv']
    )
    
    # Create processor and run
    processor = LiDARProcessor(params)
    results = processor.process_files()
    
    # Check results
    for result in results:
        if result.success:
            print(f"✅ Processed: {result.basename}")
            print(f"   Points: {len(result.points)}")
            print(f"   Breaklines: {result.statistics.get('breakline_count', 0)}")
            print(f"   Output files: {result.output_files}")
            print(f"   Elevation range: {result.statistics['elevation_summary']['min']:.2f} - "
                  f"{result.statistics['elevation_summary']['max']:.2f}")
        else:
            print(f"❌ Failed: {result.basename} - {result.error_message}")


def example_batch_processing():
    """Batch processing example: Process multiple files"""
    print("\n=== Batch Processing Example ===")
    
    # Find all LAZ files in a directory
    input_dir = Path('path/to/lidar/files')
    laz_files = list(input_dir.glob('*.laz')) + list(input_dir.glob('*.las'))
    
    params = ProcessingParameters(
        file_paths=[str(f) for f in laz_files],
        voxel_size=50,  # Larger voxel for faster processing
        threshold=0.45,
        output_formats=['dxf'],
        output_dir='path/to/output'
    )
    
    processor = LiDARProcessor(params)
    results = processor.process_files()
    
    # Summary statistics
    successful = sum(1 for r in results if r.success)
    print(f"Processed {successful}/{len(results)} files successfully")
    
    # Export summary to JSON
    summary = {
        'total_files': len(results),
        'successful': successful,
        'failed': len(results) - successful,
        'total_time': sum(r.processing_time for r in results),
        'files': [
            {
                'file': r.basename,
                'success': r.success,
                'points': len(r.points) if r.success else 0,
                'breaklines': r.statistics.get('breakline_count', 0) if r.success else 0,
                'time': r.processing_time
            }
            for r in results
        ]
    }
    
    with open('processing_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"Summary saved to processing_summary.json")


def example_merge_processing():
    """Example: Process multiple files and merge outputs"""
    print("\n=== Merge Processing Example ===")
    
    # Process multiple adjacent tiles and merge them
    tile_files = [
        '/Users/malik/Documents/PROJECTS/Potree API Final/Part 1 - Potree Converter/sample.las'
    ]
    
    params = ProcessingParameters(
        file_paths=tile_files,
        voxel_size=25,
        threshold=0.5,
        merge_outputs=True,  # Enable merging
        merged_output_name='merged_tiles',  # Name for merged output
        output_formats=['dxf', 'csv'],
        output_dir='path/to/merged_output'
    )
    
    processor = LiDARProcessor(params)
    results = processor.process_files()
    
    # The last result will be the merged one if merging was successful
    for result in results:
        if result.file_path == "MERGED":
            print(f"\n📊 Merged Output Statistics:")
            print(f"   Name: {result.basename}")
            print(f"   Total points: {len(result.points):,}")
            print(f"   Total breaklines: {result.statistics.get('breakline_count', {}).get('merged_final', 0):,}")
            print(f"   Source files: {result.statistics.get('source_files', [])}")
            print(f"   Coverage area: {result.statistics.get('coverage_area', 0):,.2f} sq units")
            print(f"   Output files: {result.output_files}")
            
            # Elevation summary for merged data
            if 'elevation_summary' in result.statistics:
                summary = result.statistics['elevation_summary']
                print(f"\n   Merged elevation range: {summary['min']:.2f} - {summary['max']:.2f}")
                print(f"   Mean elevation: {summary['mean']:.2f}")
        elif result.success:
            print(f"✅ Processed individual file: {result.basename}")
        else:
            print(f"❌ Failed: {result.basename}")


def example_with_reprojection():
    """Example with coordinate system reprojection"""
    print("\n=== Reprojection Example ===")
    
    params = ProcessingParameters(
        file_paths=['path/to/indiana_east.laz'],
        voxel_size=25,
        threshold=0.5,
        source_epsg=2967,  # NAD83(HARN) / Indiana East (ftUS)
        target_epsg=2968,  # NAD83(HARN) / Indiana West (ftUS)
        output_formats=['dxf', 'csv'],
        output_dir='path/to/reprojected'
    )
    
    processor = LiDARProcessor(params)
    results = processor.process_files()
    
    for result in results:
        if result.success:
            print(f"✅ Reprojected: {result.basename}")
            print(f"   From EPSG:{params.source_epsg} to EPSG:{params.target_epsg}")
            print(f"   Output: {result.output_files}")


def example_custom_parameters():
    """Example with custom processing parameters"""
    print("\n=== Custom Parameters Example ===")
    
    params = ProcessingParameters(
        file_paths=['path/to/dense_pointcloud.laz'],
        voxel_size=10,      # Finer resolution
        threshold=0.3,      # More sensitive breakline detection
        nth_point=5,        # Read every 5th point for faster initial processing
        output_formats=['dxf', 'csv'],
        log_file='custom_processing.log'
    )
    
    processor = LiDARProcessor(params)
    results = processor.process_files()
    
    # Print detailed statistics
    for result in results:
        if result.success:
            print(f"\n📊 Statistics for {result.basename}:")
            print(f"   Five-number summary (elevation):")
            summary = result.statistics['elevation_summary']
            print(f"     Min:    {summary['min']:.2f}")
            print(f"     Q1:     {summary['q1']:.2f}")
            print(f"     Median: {summary['median']:.2f}")
            print(f"     Q3:     {summary['q3']:.2f}")
            print(f"     Max:    {summary['max']:.2f}")
            print(f"     Mean:   {summary['mean']:.2f}")
            print(f"     StdDev: {summary['std']:.2f}")
            
            print(f"\n   Point counts:")
            counts = result.statistics['point_count']
            print(f"     Original: {counts['original']:,}")
            print(f"     Ground:   {counts['ground']:,}")
            print(f"     Final:    {counts['downsampled']:,}")
            
            print(f"\n   Classifications found:")
            if 'classifications' in result.statistics:
                for class_id, count in result.statistics['classifications'].items():
                    print(f"     Class {class_id}: {count:,} points")


def example_programmatic_access():
    """Example of accessing results programmatically"""
    print("\n=== Programmatic Access Example ===")
    
    params = ProcessingParameters(
        file_paths=['path/to/file.laz'],
        voxel_size=25,
        threshold=0.5,
        output_formats=['dxf']
    )
    
    processor = LiDARProcessor(params)
    results = processor.process_files()
    
    # Access the processed data directly
    for result in results:
        if result.success:
            # Access raw point cloud data
            points = result.points  # numpy array (N, 3)
            print(f"Point cloud shape: {points.shape}")
            
            # Access breaklines
            breaklines = result.breaklines  # List of line segments
            print(f"Number of breaklines: {len(breaklines)}")
            
            # You can now use this data for further processing
            # For example, create your own visualizations, 
            # perform additional analysis, etc.
            
            # Example: Find the steepest breakline
            if breaklines:
                max_gradient = 0
                steepest_line = None
                
                for line in breaklines:
                    if len(line) >= 2:
                        p1, p2 = line[0], line[1]
                        dx = p2[0] - p1[0]
                        dy = p2[1] - p1[1]
                        dz = p2[2] - p1[2]
                        horizontal_dist = (dx**2 + dy**2)**0.5
                        if horizontal_dist > 0:
                            gradient = abs(dz / horizontal_dist)
                            if gradient > max_gradient:
                                max_gradient = gradient
                                steepest_line = line
                
                if steepest_line:
                    print(f"Steepest breakline gradient: {max_gradient:.3f}")


def main():
    """Run all examples"""
    print("=" * 60)
    print("LiDAR Processing Backend - Example Usage")
    print("=" * 60)
    
    # Uncomment the examples you want to run:
    
    # example_basic_processing()
    # example_batch_processing()
    # example_merge_processing()
    # example_with_reprojection()
    # example_custom_parameters()
    # example_programmatic_access()
    
    # For testing with the provided log file data:
    print("\n=== Using configuration from original app ===")
    
    # Example 1: Single file processing
    params_single = ProcessingParameters(
        file_paths=['./Centerpoint Y65 Villa Distro - Point Cloud.laz'],
        voxel_size=25,
        threshold=0.50,
        output_formats=['dxf', 'csv'],
        output_dir='./tmp'
    )
    
    print(f"\nSingle File Configuration:")
    print(f"  Files: {params_single.file_paths}")
    print(f"  Voxel size: {params_single.voxel_size} feet")
    print(f"  Gradient threshold: {params_single.threshold}")
    print(f"  Output formats: {params_single.output_formats}")
    print(f"  Output directory: {params_single.output_dir}")
    
    
    
    # Create processors
    processor_single = LiDARProcessor(params_single)
    results = processor_single.process_files()  # Uncomment to run processing
    for result in results:
        if result.success:
            print(f"✅ Processed: {result.basename}")
            print(f"   Points: {len(result.points)}")
            print(f"   Breaklines: {result.statistics.get('breakline_count', 0)}")
            print(f"   Output files: {result.output_files}")
            print(f"   Stats: {result.statistics} ")
        else:
            print(f"❌ Failed: {result.basename} - {result.error_message}")
    
    
    print("\nReady to process. Call processor.process_files() to start.")


if __name__ == "__main__":
    main()