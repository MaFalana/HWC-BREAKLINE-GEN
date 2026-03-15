import { api } from './api';
import { JobStatusResponse, DownloadResponse, JobPreviewResponse, MultiFilePreviewResponse } from '../types';

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const response = await api.get<JobStatusResponse>(`/api/v1/jobs/${jobId}`);
  return response.data;
};

export const getJobPreview = async (jobId: string): Promise<JobPreviewResponse | MultiFilePreviewResponse> => {
  const response = await api.get<JobPreviewResponse | MultiFilePreviewResponse>(`/api/v1/jobs/${jobId}/preview`);
  return response.data;
};

export const getDownloadUrls = async (jobId: string, expiryHours: number = 1): Promise<DownloadResponse> => {
  const response = await api.get<DownloadResponse>(`/api/v1/download/${jobId}`, {
    params: { expiry_hours: expiryHours }
  });
  return response.data;
};

export const cancelJob = async (jobId: string): Promise<void> => {
  await api.delete(`/api/v1/jobs/${jobId}`);
};

export const downloadFile = async (url: string, filename: string): Promise<void> => {
  // Create a hidden anchor element and trigger download
  // This works with Azure Blob Storage SAS URLs without CORS issues
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};