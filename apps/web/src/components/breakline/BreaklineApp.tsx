import { useState, useEffect, useRef } from 'react';
import { HwcHeader } from '@hwc/header';
import { FileUpload } from './FileUpload';
import { Configuration } from './Configuration';
import { Preview } from './Preview';
import { Download } from './Download';
import { ProgressIndicator } from './ProgressIndicator';
import { InfoBoxes } from './InfoBoxes';
import { uploadFiles } from '../../services/upload';
import { getJobStatus, getDownloadUrls, downloadFile, getJobPreview, cancelJob } from '../../services/jobs';
import type {
  ProcessingConfig, JobStatus, PNEZDPoint,
  JobPreviewResponse, MultiFilePreviewResponse,
  FilePreview, DownloadResponse, JobStatusResponse,
} from '../../types';

import '../../styles/breakline.css';

/* tiny toast — no dep needed */
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', top: '1rem', right: '1rem', zIndex: '9999',
    padding: '0.75rem 1.25rem', borderRadius: '8px', fontFamily: 'var(--font-sans)',
    fontSize: '0.875rem', fontWeight: '500', color: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    background: type === 'error' ? '#dc2626' : '#16a34a',
    transition: 'opacity 0.3s', opacity: '1',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

export function BreaklineApp() {
  const [files, setFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<ProcessingConfig>({});
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [previewPoints, setPreviewPoints] = useState<PNEZDPoint[]>([]);
  const [previewData, setPreviewData] = useState<JobPreviewResponse | MultiFilePreviewResponse | null>(null);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string> | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobProgress, setJobProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [statusResponse, setStatusResponse] = useState<JobStatusResponse | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── polling ── */
  useEffect(() => {
    if (!currentJobId || !isPolling) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const s = await getJobStatus(currentJobId);
        setStatusResponse(s);
        setJobStatus(s.status);
        setJobProgress(s.progress ?? 0);

        if (s.status === 'processing' && !isLoadingPreview) setIsLoadingPreview(true);

        if (s.status === 'completed') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setIsPolling(false);
          setIsProcessing(false);
          setShowProgress(false);

          // fetch download urls
          let urls: DownloadResponse | null = null;
          try { urls = await getDownloadUrls(currentJobId); } catch {}

          // poll preview with retries
          let preview: (JobPreviewResponse | MultiFilePreviewResponse) | null = null;
          for (let i = 0; i < 5; i++) {
            try {
              const p = await getJobPreview(currentJobId);
              const isMulti = 'file_previews' in p;
              const hasData = isMulti
                ? (p as MultiFilePreviewResponse).file_previews.some((fp) => fp.preview_points?.length > 0)
                  || !!(p as MultiFilePreviewResponse).merged_preview?.preview_points?.length
                  || (p.total_processed_points ?? 0) > 0
                : (p as JobPreviewResponse).preview_points?.length > 0 || (p.total_processed_points ?? 0) > 0;
              if (hasData) { preview = p; break; }
            } catch {}
            await new Promise((r) => setTimeout(r, 2000));
          }

          if (preview) {
            setPreviewData(preview);
            if ('file_previews' in preview) {
              const multi = preview as MultiFilePreviewResponse;
              // Use merged_preview if file_previews is empty (merge job)
              if (multi.merged_preview?.preview_points?.length) {
                setPreviewPoints(multi.merged_preview.preview_points);
                setFilePreviews([]);
              } else if (multi.file_previews.length > 0) {
                setFilePreviews(multi.file_previews);
                setPreviewPoints(multi.file_previews[0].preview_points);
              }
            } else {
              setPreviewPoints((preview as JobPreviewResponse).preview_points);
              setFilePreviews([]);
            }
          }
          setIsLoadingPreview(false);
          if (urls) setDownloadUrls(urls.download_urls);
          showToast('Processing completed successfully!');

        } else if (s.status === 'failed') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setIsPolling(false);
          setIsProcessing(false);
          setShowProgress(false);
          showToast(s.error_message || 'Processing failed', 'error');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 3000);

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [currentJobId, isPolling]);

  /* ── handlers ── */
  const handleProcess = async () => {
    if (!files.length) { showToast('Please select files to process', 'error'); return; }
    setIsProcessing(true); setShowProgress(true); setUploadProgress(0); setJobProgress(0);
    setJobStatus('queued'); setPreviewPoints([]); setPreviewData(null); setFilePreviews([]);
    setDownloadUrls(null); setIsLoadingPreview(false); setStatusResponse(null);

    abortRef.current = new AbortController();
    try {
      const res = await uploadFiles(files, config, setUploadProgress, abortRef.current.signal);
      abortRef.current = null;
      setCurrentJobId(res.job_id);
      setIsPolling(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      showToast(err.detail || 'Upload failed', 'error');
      setIsProcessing(false); setShowProgress(false); setJobStatus(null);
      abortRef.current = null;
    }
  };

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);

    if (!currentJobId) {
      abortRef.current?.abort(); abortRef.current = null;
      setIsProcessing(false); setShowProgress(false); setJobStatus(null);
      setUploadProgress(0); setJobProgress(0); setStatusResponse(null);
      setIsCancelling(false);
      showToast('Upload cancelled');
      return;
    }

    try {
      await cancelJob(currentJobId);
      setIsPolling(false); setIsProcessing(false); setShowProgress(false);
      setCurrentJobId(null); setJobStatus(null); setUploadProgress(0);
      setJobProgress(0); setStatusResponse(null); setIsCancelling(false);
      showToast('Job cancelled successfully');
    } catch (err: any) {
      setIsCancelling(false);
      if (err.detail?.includes('completed') || err.detail?.includes('failed')) return;
      showToast(err.detail || 'Failed to cancel job', 'error');
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    setIsDownloading(true);
    try { downloadFile(url, filename); showToast(`Downloaded ${filename}`); }
    catch { showToast('Download failed', 'error'); }
    finally { setIsDownloading(false); }
  };

  /* ── derived ── */
  const stage: 'upload' | 'processing' | 'completed' | 'failed' =
    uploadProgress < 100 ? 'upload'
    : jobStatus === 'completed' ? 'completed'
    : jobStatus === 'failed' ? 'failed' : 'processing';

  const canCancel = (isProcessing || jobStatus === 'queued' || jobStatus === 'processing')
    && jobStatus !== 'completed' && jobStatus !== 'failed';

  return (
    <div className="bl-page">
      <HwcHeader
        logoSrc="/assets/HWC-Logo-Light.png"
        title="LiDAR Breakline Generator"
        right={
          showProgress ? (
            <div className="bl-header-status">
              <span className={`bl-header-dot bl-progress-dot ${stage}`} />
              <span className="bl-header-label">
                {uploadProgress < 100 ? `Uploading... ${uploadProgress}%`
                  : jobStatus === 'completed' ? 'Completed'
                  : jobStatus === 'failed' ? 'Failed'
                  : jobStatus === 'processing' ? `Processing... ${jobProgress}%`
                  : 'Queued'}
              </span>
              {canCancel && (
                <button className="bl-btn bl-btn-danger" disabled={isCancelling} onClick={handleCancel} style={{ padding: '0.5rem 1rem' }}>
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {showProgress && (
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            <ProgressIndicator
              stage={stage}
              uploadProgress={uploadProgress}
              jobStatus={jobStatus ?? undefined}
              jobProgress={jobProgress}
              totalFiles={statusResponse?.total_files ?? (files.length > 1 ? files.length : undefined)}
              currentFile={statusResponse?.current_file}
            />
          </div>
        </div>
      )}

      <main className="bl-main">
        <InfoBoxes />
        <div className="bl-grid">
          <div className="bl-col">
            <FileUpload files={files} onFilesChange={setFiles} />
            <div className="bl-desktop-only">
              <Preview
                points={previewPoints}
                isLoading={isLoadingPreview || (isPolling && jobStatus === 'processing')}
                totalPoints={previewData && 'total_processed_points' in previewData ? previewData.total_processed_points : undefined}
                elevationStats={
                  previewData && 'elevation_statistics' in previewData
                    ? previewData.elevation_statistics
                    : previewData && 'merged_preview' in previewData && (previewData as MultiFilePreviewResponse).merged_preview
                      ? (previewData as MultiFilePreviewResponse).merged_preview!.elevation_statistics
                      : undefined
                }
                filePreviews={filePreviews.length > 0 ? filePreviews : undefined}
                isMultiFile={filePreviews.length > 0}
              />
            </div>
          </div>
          <div className="bl-col">
            <Configuration
              config={config}
              onConfigChange={setConfig}
              onProcess={handleProcess}
              isProcessing={isProcessing || isPolling}
              filesSelected={files.length > 0}
            />
            <div className="bl-mobile-only">
              <Preview
                points={previewPoints}
                isLoading={isLoadingPreview || (isPolling && jobStatus === 'processing')}
                totalPoints={previewData && 'total_processed_points' in previewData ? previewData.total_processed_points : undefined}
                elevationStats={
                  previewData && 'elevation_statistics' in previewData
                    ? previewData.elevation_statistics
                    : previewData && 'merged_preview' in previewData && (previewData as MultiFilePreviewResponse).merged_preview
                      ? (previewData as MultiFilePreviewResponse).merged_preview!.elevation_statistics
                      : undefined
                }
                filePreviews={filePreviews.length > 0 ? filePreviews : undefined}
                isMultiFile={filePreviews.length > 0}
              />
            </div>
            <Download
              downloadUrls={downloadUrls}
              isDownloading={isDownloading}
              onDownload={handleDownload}
              mergeEnabled={config.merge_outputs}
            />
          </div>
        </div>
      </main>

      <footer className="bl-footer">
        © {new Date().getFullYear()} HWC Engineering. All rights reserved.
      </footer>
    </div>
  );
}
