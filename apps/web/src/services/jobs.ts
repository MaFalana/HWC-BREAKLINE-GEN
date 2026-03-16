import { request } from './api';
import type {
  JobStatusResponse, DownloadResponse,
  JobPreviewResponse, MultiFilePreviewResponse,
} from '../types';

export const getJobStatus = (jobId: string) =>
  request<JobStatusResponse>(`/api/v1/jobs/${jobId}`);

export const getJobPreview = (jobId: string) =>
  request<JobPreviewResponse | MultiFilePreviewResponse>(`/api/v1/jobs/${jobId}/preview`);

export const getDownloadUrls = (jobId: string, expiryHours = 1) =>
  request<DownloadResponse>(`/api/v1/download/${jobId}?expiry_hours=${expiryHours}`);

export const cancelJob = (jobId: string) =>
  request<void>(`/api/v1/jobs/${jobId}`, { method: 'DELETE' });

export function downloadFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
