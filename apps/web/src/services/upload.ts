import { getBaseUrl } from './api';
import type { UploadResponse, ProcessingConfig } from '../types';

export function uploadFiles(
  files: File[],
  config: ProcessingConfig,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<UploadResponse> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));

  if (config.voxel_size) form.append('voxel_size', String(config.voxel_size));
  if (config.threshold) form.append('threshold', String(config.threshold));
  if (config.source_epsg) form.append('source_epsg', String(config.source_epsg));
  if (config.target_epsg) form.append('target_epsg', String(config.target_epsg));
  if (config.output_formats) form.append('output_formats', config.output_formats);
  if (config.merge_outputs !== undefined) form.append('merge_outputs', String(config.merge_outputs));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getBaseUrl()}/api/v1/upload/`);
    xhr.setRequestHeader('Accept', 'application/json');

    signal?.addEventListener('abort', () => xhr.abort());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else {
        try { reject({ status: xhr.status, detail: JSON.parse(xhr.responseText).detail }); }
        catch { reject({ status: xhr.status, detail: xhr.statusText }); }
      }
    };
    xhr.onerror = () => reject({ status: 0, detail: 'Network error' });
    xhr.onabort = () => reject({ name: 'AbortError', detail: 'Cancelled' });
    xhr.send(form);
  });
}
