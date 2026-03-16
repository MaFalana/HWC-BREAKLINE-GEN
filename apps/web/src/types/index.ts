export interface UploadResponse {
  job_id: string;
  status: JobStatus;
  message: string;
  files_uploaded: number;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  progress?: number;
  total_files?: number;
  current_file?: string;
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
  source_epsg?: number;
  target_epsg?: number;
  output_formats?: string;
  merge_outputs?: boolean;
}

export interface EPSGOption {
  name: string;
  unit: string;
  proj4: string;
  _id: number;
}

export interface PNEZDPoint {
  point: number;
  northing: number;
  easting: number;
  elevation: number;
  description: string;
}

export interface ElevationStatistics {
  min: number; max: number; mean: number;
  q1: number; median: number; q3: number;
  std_dev: number; variance: number; range: number; iqr: number;
}

export interface FilePreview {
  preview_points: PNEZDPoint[];
  elevation_statistics: ElevationStatistics;
}

export interface JobPreviewResponse {
  job_id: string;
  total_processed_points?: number;
  preview_points: PNEZDPoint[];
  elevation_statistics: ElevationStatistics;
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
