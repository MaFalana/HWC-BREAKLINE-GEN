import { api } from './api';
import { UploadResponse, ProcessingConfig } from '../types';

export const uploadFiles = async (
  files: File[],
  config: ProcessingConfig,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<UploadResponse> => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  // Add configuration parameters
  if (config.voxel_size) formData.append('voxel_size', config.voxel_size.toString());
  if (config.threshold) formData.append('threshold', config.threshold.toString());
  if (config.nth_point) formData.append('nth_point', config.nth_point.toString());
  if (config.source_epsg) formData.append('source_epsg', config.source_epsg.toString());
  if (config.target_epsg) formData.append('target_epsg', config.target_epsg.toString());
  if (config.output_formats) formData.append('output_formats', config.output_formats);
  if (config.merge_outputs !== undefined) formData.append('merge_outputs', config.merge_outputs.toString());
  if (config.merged_output_name) formData.append('merged_output_name', config.merged_output_name);

  const response = await api.post<UploadResponse>('/api/v1/upload/', formData, {
    // Don't set Content-Type header - let browser set it with boundary
    signal: abortSignal,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
};