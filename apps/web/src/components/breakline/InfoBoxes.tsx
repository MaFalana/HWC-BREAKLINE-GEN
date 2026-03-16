export function InfoBoxes() {
  return (
    <div className="bl-info-stack">
      <div className="bl-info-box blue">
        <svg className="bl-info-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="bl-info-title">Indiana Statewide LiDAR Reference</p>
          <p className="bl-info-text">NAD83(HARN) / Indiana East (ftUS) = EPSG:2967</p>
          <p className="bl-info-text">NAD83(HARN) / Indiana West (ftUS) = EPSG:2968</p>
        </div>
      </div>

      <div className="bl-info-box green">
        <svg className="bl-info-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 4a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="bl-info-title">LiDAR Data Source</p>
          <p className="bl-info-text">LiDAR Data hosted by iDiF @ Purdue</p>
          <a className="bl-info-link" href="https://lidar.digitalforestry.org" target="_blank" rel="noopener noreferrer">
            Visit LiDAR Source
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
