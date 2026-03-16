import { useState } from 'react';
import type { PNEZDPoint, ElevationStatistics, FilePreview } from '../../types';

interface Props {
  points: PNEZDPoint[];
  isLoading: boolean;
  totalPoints?: number;
  elevationStats?: ElevationStatistics;
  filePreviews?: FilePreview[];
  isMultiFile?: boolean;
}

export function Preview({ points, isLoading, totalPoints, elevationStats, filePreviews, isMultiFile }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const activePreview = isMultiFile && filePreviews ? filePreviews[activeTab] : null;
  const displayPoints = activePreview ? activePreview.preview_points : points;

  const stats = activePreview
    ? { min: activePreview.elevation_statistics.min, max: activePreview.elevation_statistics.max, avg: activePreview.elevation_statistics.mean }
    : elevationStats
    ? { min: elevationStats.min, max: elevationStats.max, avg: elevationStats.mean }
    : displayPoints.length > 0
    ? (() => {
        const el = displayPoints.map((p) => p.elevation);
        return { min: Math.min(...el), max: Math.max(...el), avg: el.reduce((a, b) => a + b, 0) / el.length };
      })()
    : { min: 0, max: 0, avg: 0 };

  const total = activePreview?.elevation_statistics
    ? undefined // no data_quality in simplified type
    : totalPoints ?? displayPoints.length;

  return (
    <div className="bl-card">
      <div className="bl-section-hdr">
        <span className="bl-step">3</span>
        <h2 className="bl-section-title">PNEZD Preview</h2>
      </div>

      {isMultiFile && filePreviews && filePreviews.length > 1 && (
        <div className="bl-tabs">
          {filePreviews.map((_, i) => (
            <button key={i} className={`bl-tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
              File {i + 1}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="bl-spinner"><div className="bl-spinner-ring" /></div>
      ) : displayPoints.length > 0 ? (
        <>
          <div className="bl-stats-grid">
            <div className="bl-stat">
              <p className="bl-stat-label">Total Points</p>
              <p className="bl-stat-value">{(total ?? 0).toLocaleString()}</p>
            </div>
            <div className="bl-stat">
              <p className="bl-stat-label">Min Elevation</p>
              <p className="bl-stat-value">{stats.min.toFixed(2)}</p>
            </div>
            <div className="bl-stat">
              <p className="bl-stat-label">Avg Elevation</p>
              <p className="bl-stat-value">{stats.avg.toFixed(2)}</p>
            </div>
            <div className="bl-stat">
              <p className="bl-stat-label">Max Elevation</p>
              <p className="bl-stat-value">{stats.max.toFixed(2)}</p>
            </div>
          </div>

          <div className="bl-table-wrap">
            <div className="bl-table-scroll">
              <table className="bl-table">
                <thead>
                  <tr>
                    <th>Point</th><th>Northing</th><th>Easting</th><th>Elevation</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPoints.slice(0, 50).map((p, i) => (
                    <tr key={i}>
                      <td>{p.point}</td>
                      <td>{p.northing.toFixed(3)}</td>
                      <td>{p.easting.toFixed(3)}</td>
                      <td>{p.elevation.toFixed(3)}</td>
                      <td style={{ color: 'var(--muted)' }}>{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="bl-table-footer">
            Showing {Math.min(50, displayPoints.length)} of {(total ?? displayPoints.length).toLocaleString()} processed points
          </p>
        </>
      ) : (
        <div className="bl-empty">
          <svg className="bl-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a3 3 0 003 3h0a3 3 0 003-3v-1m-6 0h6M9 17V7a3 3 0 013-3h0a3 3 0 013 3v10M9 17H7m8 0h2" />
          </svg>
          <p>No preview data available</p>
          <p className="sub">Process files to see preview</p>
        </div>
      )}
    </div>
  );
}
