import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { FileUpload } from './components/FileUpload/FileUpload';
import { Configuration } from './components/Configuration/Configuration';
import { Preview } from './components/Preview/Preview';
import { Download } from './components/Download/Download';
import { ProgressIndicator } from './components/Progress/ProgressIndicator';
import { InfoBoxes } from './components/InfoBoxes/InfoBoxes';
import { uploadFiles } from './services/upload';
import { getJobStatus, getDownloadUrls, downloadFile, getJobPreview, cancelJob } from './services/jobs';
import { ProcessingConfig, JobStatus, PNEZDPoint, JobPreviewResponse, MultiFilePreviewResponse, FilePreview, DownloadResponse, JobStatusResponse } from './types';
import { hwcLogoDark } from './assets/index';
import './styles/index.css';

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<ProcessingConfig>({});
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [previewPoints, setPreviewPoints] = useState<PNEZDPoint[]>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [previewData, setPreviewData] = useState<JobPreviewResponse | MultiFilePreviewResponse | null>(null);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string> | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobProgress, setJobProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  // Enhanced progress tracking
  const [statusResponse, setStatusResponse] = useState<JobStatusResponse | null>(null);

  // Poll job status
  useEffect(() => {
    if (!currentJobId || !isPolling) {
      // Clear any existing interval when polling stops
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval before creating a new one
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(currentJobId);
        setStatusResponse(status);
        setJobStatus(status.status);
        setJobProgress(status.progress || 0);

        // Start preview loading when we first detect processing
        if (status.status === 'processing' && !isLoadingPreview) {
          console.log('Job started processing - beginning preview loading state');
          setIsLoadingPreview(true);
        }

        if (status.status === 'completed') {
          // IMMEDIATELY stop the interval - this is the key fix!
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // Now update states
          setIsPolling(false);
          setIsProcessing(false);
          setShowProgress(false);


          // Preview loading state should already be active from when processing started
          // setIsLoadingPreview(true); // Already set when job started processing

          // Start with download URLs immediately (these are usually ready)
          let urlsResult: PromiseSettledResult<DownloadResponse> | undefined;
          try {
            const urlsResponse = await getDownloadUrls(currentJobId);
            urlsResult = { status: 'fulfilled' as const, value: urlsResponse };
          } catch (error) {
            urlsResult = { status: 'rejected' as const, reason: error };
          }

          // Poll preview endpoint until data is ready
          let previewResult: PromiseSettledResult<JobPreviewResponse | MultiFilePreviewResponse> | undefined;
          let retryCount = 0;
          const maxRetries = 5; // Try up to 5 times

          console.log('Polling for preview data...');
          while (retryCount <= maxRetries) {
            try {
              const preview = await getJobPreview(currentJobId);

              // Check if preview has actual data - use total_processed_points as fallback
              let hasValidData = false;
              if ('file_previews' in preview) {
                // Multi-file response - check if any file has preview points OR if total points exist
                hasValidData = preview.file_previews.some(fp => fp.preview_points && fp.preview_points.length > 0) ||
                  !!(preview.total_processed_points && preview.total_processed_points > 0);
              } else {
                // Single file response - check preview points OR total processed points
                hasValidData = !!(preview.preview_points && preview.preview_points.length > 0) ||
                  !!(preview.total_processed_points && preview.total_processed_points > 0);
              }

              if (hasValidData) {
                console.log(`Preview data ready! (attempt ${retryCount + 1})`);
                previewResult = { status: 'fulfilled' as const, value: preview };
                break;
              } else {
                console.log(`Preview data not ready yet, attempt ${retryCount + 1}/${maxRetries + 1}`);
              }
            } catch (error) {
              console.log(`Preview fetch error on attempt ${retryCount + 1}:`, error);
            }

            // If we need to retry, wait before next attempt
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            }
            retryCount++;
          }

          // If we still don't have preview data, mark as failed
          if (!previewResult || previewResult.status !== 'fulfilled') {
            console.log('Failed to get preview data after all retries');
            previewResult = {
              status: 'rejected' as const,
              reason: new Error('Preview data not available after polling')
            };
          }

          // Process preview data (priority - users want to see this first)
          if (previewResult && previewResult.status === 'fulfilled') {
            const preview = previewResult.value;
            setPreviewData(preview);

            // Check if it's a multi-file response
            if ('file_previews' in preview) {
              // Multi-file response
              setFilePreviews(preview.file_previews);
              // Use first file's preview points for backward compatibility
              if (preview.file_previews.length > 0) {
                setPreviewPoints(preview.file_previews[0].preview_points);
              }
            } else {
              // Single file response
              setPreviewPoints(preview.preview_points);
              setFilePreviews([]);
            }
          } else if (previewResult && previewResult.status === 'rejected') {
            console.error('Error fetching preview:', previewResult.reason);
            // Fallback to CSV parsing if preview API fails and we have download URLs
            if (urlsResult && urlsResult.status === 'fulfilled') {
              const csvEntry = Object.entries(urlsResult.value.download_urls).find(([name]) => name.endsWith('.csv'));
              if (csvEntry && csvEntry[1]) {
                const csvUrl = csvEntry[1];
                await loadPreviewFromCsv(csvUrl);
              }
            }
          }

          // Clear loading state after preview is processed
          setIsLoadingPreview(false);

          // Process download URLs
          if (urlsResult && urlsResult.status === 'fulfilled') {
            setDownloadUrls(urlsResult.value.download_urls);
          } else if (urlsResult && urlsResult.status === 'rejected') {
            console.error('Error fetching download URLs:', urlsResult.reason);
            // Could retry or show error toast here if needed
          }
        } else if (status.status === 'failed') {
          // Stop the interval for failed jobs too
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setIsPolling(false);
          setIsProcessing(false);
          setShowProgress(false);
          toast.error(status.error_message || 'Processing failed');
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 3000);

    // Cleanup function - runs when component unmounts or dependencies change
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [currentJobId, isPolling]);

  // Show completion toast only once when job status changes to completed
  useEffect(() => {
    if (jobStatus === 'completed') {
      toast.success('Processing completed successfully!');
    }
  }, [jobStatus]);

  const loadPreviewFromCsv = async (csvUrl: string) => {
    try {
      // Use fetch with proper headers to avoid CORS
      const response = await fetch(csvUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        console.warn('CSV file is empty');
        return;
      }

      // Parse CSV - expect format: Point,Northing,Easting,Elevation,Description
      // Skip header row if it contains text
      const hasHeader = lines[0].toLowerCase().includes('point') ||
        lines[0].toLowerCase().includes('northing') ||
        lines[0].toLowerCase().includes('easting');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const points: PNEZDPoint[] = dataLines.slice(0, 50).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        return {
          point: parseInt(values[0]) || index + 1,
          northing: parseFloat(values[1]) || 0,
          easting: parseFloat(values[2]) || 0,
          elevation: parseFloat(values[3]) || 0,
          description: values[4] || '',
        };
      }).filter(point => !isNaN(point.northing) && !isNaN(point.easting) && !isNaN(point.elevation));

      setPreviewPoints(points);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview data');
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Please select files to process');
      return;
    }

    // Reset state for new processing
    setIsProcessing(true);
    setShowProgress(true);
    setUploadProgress(0);
    setJobProgress(0);
    setJobStatus('queued');
    setPreviewPoints([]);
    setPreviewData(null);
    setFilePreviews([]);
    setDownloadUrls(null);
    setIsLoadingPreview(false);
    setStatusResponse(null);

    // Create new AbortController for this upload
    abortControllerRef.current = new AbortController();

    try {
      const response = await uploadFiles(
        files,
        config,
        (progress) => {
          setUploadProgress(progress);
        },
        abortControllerRef.current.signal
      );

      // Clear the abort controller after successful upload
      abortControllerRef.current = null;

      setCurrentJobId(response.job_id);
      setIsPolling(true);
    } catch (error: any) {
      // Check if the error was due to cancellation
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        // Don't show error toast for user-initiated cancellation
        return;
      }

      toast.error(error.response?.data?.detail || 'Upload failed');
      setIsProcessing(false);
      setShowProgress(false);
      setJobStatus(null);
      abortControllerRef.current = null;
    }
  };

  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;

    const extension = filename.substring(filename.lastIndexOf('.'));
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';

    return truncatedName + extension;
  };

  const handleCancelJob = async () => {
    if (isCancelling) return; // Prevent multiple cancel requests

    setIsCancelling(true);

    // If we're still uploading (no job ID yet), abort the upload
    if (!currentJobId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
      setShowProgress(false);
      setJobStatus(null);
      setUploadProgress(0);
      setJobProgress(0);
      setStatusResponse(null);
      setIsCancelling(false);
      toast.success('Upload cancelled');
      return;
    }

    try {
      await cancelJob(currentJobId);

      // Stop polling
      setIsPolling(false);

      // Reset state
      setIsProcessing(false);
      setShowProgress(false);
      setCurrentJobId(null);
      setJobStatus(null);
      setUploadProgress(0);
      setJobProgress(0);
      setStatusResponse(null);
      setIsCancelling(false);

      toast.success('Job cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling job:', error);
      setIsCancelling(false);

      // Check if the error is because the job is already completed/failed
      const errorMessage = error.response?.data?.detail || '';
      if (errorMessage.includes('completed') || errorMessage.includes('failed')) {
        // Job already finished, just hide the cancel button by not showing error
        // The UI will update on next poll
        return;
      }

      toast.error(errorMessage || 'Failed to cancel job');
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    setIsDownloading(true);
    try {
      await downloadFile(url, filename);
      toast.success(`Downloaded ${truncateFilename(filename)}`);
    } catch (error) {
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={hwcLogoDark}
                alt="HWC Engineering"
                className="h-8 sm:h-10"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-hwc-dark">LiDAR Breakline Generator</h1>
                <p className="text-xs sm:text-sm text-gray-600">Process point cloud files to generate breaklines</p>
              </div>
            </div>
            {showProgress && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${uploadProgress < 100 ? 'bg-blue-500 animate-pulse' :
                    jobStatus === 'completed' ? 'bg-green-500' :
                      jobStatus === 'failed' ? 'bg-red-500' :
                        jobStatus === 'processing' ? 'bg-yellow-500 animate-pulse' :
                          'bg-gray-500'
                    }`}></div>
                  <span className="text-sm font-medium">
                    {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` :
                      jobStatus === 'completed' ? 'Completed' :
                        jobStatus === 'failed' ? 'Failed' :
                          jobStatus === 'processing' ? `Processing... ${jobProgress}%` :
                            'Queued'}
                  </span>
                </div>
                {(isProcessing || jobStatus === 'queued' || jobStatus === 'processing') &&
                  jobStatus !== 'completed' &&
                  jobStatus !== 'failed' && (
                    <button
                      onClick={handleCancelJob}
                      disabled={isCancelling}
                      className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isCancelling
                        ? 'bg-red-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {isCancelling ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Progress Bar */}
        {showProgress && (
          <div className="bg-white border-t border-gray-100 px-4 sm:px-6 lg:px-8 py-3">
            <div className="max-w-7xl mx-auto">
              <ProgressIndicator
                stage={uploadProgress < 100 ? 'upload' : jobStatus === 'completed' ? 'completed' : jobStatus === 'failed' ? 'failed' : 'processing'}
                uploadProgress={uploadProgress}
                jobStatus={jobStatus || undefined}
                jobProgress={jobProgress}
                totalFiles={statusResponse?.total_files || (files.length > 1 ? files.length : undefined)}
                currentFile={statusResponse?.current_file}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Boxes - Reference Information */}
        <div className="mb-6">
          <InfoBoxes />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Left Column - Mobile: Section 1 then 3 */}
          <div className="space-y-6">
            <FileUpload files={files} onFilesChange={setFiles} />
            {/* Desktop: Preview (Section 3) in bottom left */}
            <div className="hidden lg:block">
              <Preview
                points={previewPoints}
                isLoading={isLoadingPreview || (isPolling && jobStatus === 'processing')}
                totalPoints={
                  previewData ? (
                    'total_processed_points' in previewData ? previewData.total_processed_points :
                      'data_quality' in previewData ? previewData.data_quality.total_points :
                        undefined
                  ) : undefined
                }
                elevationStats={previewData && 'elevation_statistics' in previewData ? previewData.elevation_statistics : undefined}
                filePreviews={filePreviews.length > 0 ? filePreviews : undefined}
                isMultiFile={filePreviews.length > 0}
              />
            </div>
          </div>

          {/* Right Column - Mobile: Section 2 then 4 */}
          <div className="space-y-6">
            <Configuration
              config={config}
              onConfigChange={setConfig}
              onProcess={handleProcess}
              isProcessing={isProcessing || isPolling}
              filesSelected={files.length > 0}
            />
            {/* Mobile: Preview (Section 3) after Configuration */}
            <div className="lg:hidden">
              <Preview
                points={previewPoints}
                isLoading={isLoadingPreview || (isPolling && jobStatus === 'processing')}
                totalPoints={
                  previewData ? (
                    'total_processed_points' in previewData ? previewData.total_processed_points :
                      'data_quality' in previewData ? previewData.data_quality.total_points :
                        undefined
                  ) : undefined
                }
                elevationStats={previewData && 'elevation_statistics' in previewData ? previewData.elevation_statistics : undefined}
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

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} HWC Engineering. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;