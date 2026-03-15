"""
Example usage of the LiDAR Processing Engine

Run from the source/ directory:
    python examples.py
"""

from process import LiDARProcessor, ProcessingParameters


def example_single_file():
    """Process a single LAS/LAZ file with default settings."""
    params = ProcessingParameters(
        file_paths=["path/to/file.laz"],
        voxel_size=25,
        threshold=0.5,
        output_formats=["dxf", "csv"],
        output_dir="./output",
    )

    processor = LiDARProcessor(params)
    results = processor.process_files()

    for r in results:
        if r.success:
            print(f"OK  {r.basename}  points={len(r.points)}  breaklines={r.statistics.get('breakline_count', 0)}")
            print(f"    outputs: {list(r.output_files.values())}")
        else:
            print(f"FAIL  {r.basename}  {r.error_message}")


def example_batch_with_merge():
    """Process multiple files and merge outputs."""
    params = ProcessingParameters(
        file_paths=["tile_a.laz", "tile_b.laz"],
        voxel_size=25,
        threshold=0.5,
        merge_outputs=True,
        merged_output_name="merged_tiles",
        output_formats=["dxf"],
        output_dir="./output",
    )

    processor = LiDARProcessor(params)
    results = processor.process_files()

    for r in results:
        tag = "MERGED" if r.file_path == "MERGED" else r.basename
        print(f"{'OK' if r.success else 'FAIL'}  {tag}  points={len(r.points)}")


def example_with_reprojection():
    """Process with coordinate reprojection."""
    params = ProcessingParameters(
        file_paths=["path/to/file.laz"],
        voxel_size=25,
        threshold=0.5,
        source_epsg=2223,
        target_epsg=4326,
        output_formats=["dxf", "csv"],
        output_dir="./output",
    )

    processor = LiDARProcessor(params)
    results = processor.process_files()

    for r in results:
        print(f"{'OK' if r.success else 'FAIL'}  {r.basename}")


if __name__ == "__main__":
    # Uncomment the example you want to run:
    # example_single_file()
    # example_batch_with_merge()
    # example_with_reprojection()
    print("Uncomment an example in __main__ to run it.")
