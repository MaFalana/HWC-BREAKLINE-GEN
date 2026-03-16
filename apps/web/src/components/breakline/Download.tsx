interface Props {
  downloadUrls: Record<string, string> | null;
  isDownloading: boolean;
  onDownload: (url: string, filename: string) => void;
  mergeEnabled?: boolean;
}

export function Download({ downloadUrls, isDownloading, onDownload, mergeEnabled }: Props) {
  const getFiltered = () => {
    if (!downloadUrls) return {};
    // Always filter out preview CSVs — they're internal artifacts
    const filtered = Object.fromEntries(
      Object.entries(downloadUrls).filter(([n]) => !n.includes('_preview.csv')),
    );
    if (mergeEnabled) {
      return Object.fromEntries(
        Object.entries(filtered).filter(([n]) => n.includes('merged') || n.includes('output')),
      );
    }
    return filtered;
  };

  const urls = getFiltered();
  const entries = Object.entries(urls);

  return (
    <div className="bl-card">
      <div className="bl-section-hdr">
        <span className="bl-step">4</span>
        <h2 className="bl-section-title">Outputs</h2>
      </div>

      {entries.length > 0 ? (
        <>
          {entries.map(([name, url]) => (
            <div key={name} className="bl-download-item">
              <span className="bl-download-badge">{name.split('.').pop()?.toUpperCase()}</span>
              <div className="bl-download-info">
                <div className="bl-download-name">{name}</div>
                <div className="bl-download-ready">Ready for download</div>
              </div>
              <button className="bl-btn bl-btn-secondary" disabled={isDownloading} onClick={() => onDownload(url, name)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Download
              </button>
            </div>
          ))}

          {entries.length > 1 && (
            <button
              className="bl-btn bl-btn-primary bl-btn-full"
              disabled={isDownloading}
              onClick={async () => { for (const [n, u] of entries) await onDownload(u, n); }}
              style={{ marginTop: '1rem' }}
            >
              Download All Files
            </button>
          )}

          <div className="bl-info-box yellow" style={{ marginTop: '1rem' }}>
            <svg className="bl-info-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="bl-info-title">Download Notice</p>
              <p className="bl-info-text">Files will be automatically deleted from the server after download or within 24 hours.</p>
            </div>
          </div>
        </>
      ) : (
        <div className="bl-empty">
          <svg className="bl-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <p>No outputs available</p>
          <p className="sub">Process files to generate outputs</p>
        </div>
      )}
    </div>
  );
}
