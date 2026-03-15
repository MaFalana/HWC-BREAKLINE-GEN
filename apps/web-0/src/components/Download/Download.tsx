import React from 'react';

interface DownloadProps {
  downloadUrls: Record<string, string> | null;
  isDownloading: boolean;
  onDownload: (url: string, filename: string) => void;
  mergeEnabled?: boolean;
}

export const Download: React.FC<DownloadProps> = ({ downloadUrls, isDownloading, onDownload, mergeEnabled = false }) => {
  const getFileFormat = (filename: string): string => {
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };


  const getFilteredUrls = () => {
    if (!downloadUrls) return {};
    
    // If merge is enabled, only show merged files
    if (mergeEnabled) {
      return Object.fromEntries(
        Object.entries(downloadUrls).filter(([filename]) => 
          filename.includes('merged') || filename.includes('output')
        )
      );
    }
    
    return downloadUrls;
  };

  const handleDownloadAll = async () => {
    const urls = getFilteredUrls();
    
    for (const [filename, url] of Object.entries(urls)) {
      await onDownload(url, filename);
    }
  };

  return (
    <div className="section-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-hwc-red text-white rounded-lg font-semibold">
          4
        </div>
        <h2 className="text-xl font-semibold">Outputs</h2>
      </div>

      {downloadUrls && Object.keys(downloadUrls).length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-3">
            {Object.entries(getFilteredUrls()).map(([filename, url]) => (
              <div key={filename} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-hwc-red/10 text-hwc-red rounded-lg flex-shrink-0">
                    <span className="text-xs font-semibold">{getFileFormat(filename)}</span>
                  </div>
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-medium text-gray-900 text-sm leading-tight break-all" title={filename}>
                      {filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Ready for download</p>
                  </div>
                  <button
                    onClick={() => onDownload(url, filename)}
                    disabled={isDownloading}
                    className="btn-secondary flex items-center gap-1 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(getFilteredUrls()).length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Download All Files
            </button>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-yellow-900">Download Notice</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Files will be automatically deleted from the server after download or within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <p>No outputs available</p>
          <p className="text-sm mt-2">Process files to generate outputs</p>
        </div>
      )}
    </div>
  );
};