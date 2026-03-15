export interface UploadResponse {
  job_id: string;
  status: JobStatus;
  message: string;
  files_uploaded: number;
}

export interface ProcessingPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;
  label: string;
  description?: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  progress?: number;
  current_phase?: string;
  phase_progress?: number;
  phases?: ProcessingPhase[];
  files_processed?: number;
  total_files?: number;
  current_file?: string;
  estimated_time_remaining?: number;
  input_files: string[];
  output_files?: string[];
  error_message?: string;
}

export interface DownloadResponse {
  job_id: string;
  download_urls: Record<string, string>;
  expires_at: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'deleted';

export interface ProcessingConfig {
  voxel_size?: number;
  threshold?: number;
  nth_point?: number;
  source_epsg?: number;
  target_epsg?: number;
  output_formats?: string;
  merge_outputs?: boolean;
  merged_output_name?: string;
}

export interface EPSGOption {
  name: string;
  unit: string;
  proj4: string;
  _id: number;
}

export interface GridSpacingOption {
  label: string;
  value: number;
}

export interface PNEZDPoint {
  point: number;
  northing: number;
  easting: number;
  elevation: number;
  description: string;
}

export interface ElevationStatistics {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  std_dev: number;
  variance: number;
  range: number;
  iqr: number;
}

export interface SpatialCoverage {
  bounding_box: {
    min_northing: number;
    max_northing: number;
    min_easting: number;
    max_easting: number;
    min_elevation: number;
    max_elevation: number;
  };
  area_sq_meters: number;
  area_acres: number;
  area_hectares: number;
  point_density: number;
  coordinate_system: string;
}

export interface DataQuality {
  total_points: number;
  classifications: Array<{
    code: number;
    name: string;
    count: number;
    percentage: number;
  }>;
  return_types: {
    single: number;
    first: number;
    last: number;
    intermediate: number;
  };
  gps_time_range: {
    min: number;
    max: number;
    range_seconds: number;
  };
  intensity_stats: {
    min: number;
    max: number;
    mean: number;
    std_dev: number;
  };
}

export interface FileMetadata {
  filename: string;
  file_size_mb: number;
  las_version: string;
  point_data_format: number;
  creation_date: string;
  generating_software: string;
  system_identifier: string;
}

export interface FilePreview {
  preview_points: PNEZDPoint[];
  elevation_statistics: ElevationStatistics;
  spatial_coverage: SpatialCoverage;
  data_quality: DataQuality;
  file_metadata: FileMetadata;
}

export interface JobPreviewResponse {
  job_id: string;
  total_processed_points?: number;
  preview_points: PNEZDPoint[];
  elevation_statistics: ElevationStatistics;
  spatial_coverage: SpatialCoverage;
  data_quality: DataQuality;
  file_metadata: FileMetadata;
  processing_time_ms: number;
}

export interface MultiFilePreviewResponse {
  job_id: string;
  is_merge_job: boolean;
  file_count: number;
  total_processed_points?: number;
  file_previews: FilePreview[];
  merged_preview: FilePreview | null;
  processing_time_ms: number;
}