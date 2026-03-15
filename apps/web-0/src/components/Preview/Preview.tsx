import React, { useState } from 'react';
import { PNEZDPoint, ElevationStatistics, FilePreview } from '../../types';

interface PreviewProps {
  points: PNEZDPoint[];
  isLoading: boolean;
  totalPoints?: number;
  elevationStats?: ElevationStatistics;
  filePreviews?: FilePreview[];
  isMultiFile?: boolean;
}

export const Preview: React.FC<PreviewProps> = ({ points, isLoading, totalPoints, elevationStats, filePreviews, isMultiFile }) => {
  const [activeTab, setActiveTab] = useState(0);
  const calculateStats = () => {
    if (points.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const elevations = points.map(p => p.elevation);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const avg = elevations.reduce((a, b) => a + b, 0) / elevations.length;
    
    return { min, max, avg };
  };

  // Use data from active tab if multi-file, otherwise use props
  const activePreview = isMultiFile && filePreviews ? filePreviews[activeTab] : null;
  const displayPoints = activePreview ? activePreview.preview_points : points;
  const displayStats = activePreview 
    ? { min: activePreview.elevation_statistics.min, max: activePreview.elevation_statistics.max, avg: activePreview.elevation_statistics.mean }
    : elevationStats 
    ? { min: elevationStats.min, max: elevationStats.max, avg: elevationStats.mean }
    : calculateStats();
  // Better fallback logic for total points
  const displayTotalPoints = activePreview?.data_quality?.total_points || 
                            totalPoints || 
                            (filePreviews && filePreviews[0]?.data_quality?.total_points) ||
                            displayPoints.length;

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-hwc-red text-white rounded-lg font-semibold">
            3
          </div>
          <h2 className="text-xl font-semibold">PNEZD Preview</h2>
        </div>
        {isMultiFile && filePreviews && filePreviews.length > 1 && (
          <span className="text-sm text-gray-500">{filePreviews.length} files processed</span>
        )}
      </div>

      {/* Tabs for multiple files */}
      {isMultiFile && filePreviews && filePreviews.length > 1 && (
        <div className="border-b border-gray-200 mb-4">
          <div className="flex space-x-1 overflow-x-auto">
            {filePreviews.map((preview, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === index
                    ? 'text-hwc-red border-b-2 border-hwc-red bg-gray-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {preview.file_metadata.filename.replace('.las', '').replace('.laz', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hwc-red"></div>
        </div>
      ) : displayPoints.length > 0 ? (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Points</p>
              <p className="text-lg font-semibold text-hwc-dark">{displayTotalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Min Elevation</p>
              <p className="text-lg font-semibold text-hwc-dark">{displayStats.min.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Elevation</p>
              <p className="text-lg font-semibold text-hwc-dark">{displayStats.avg.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Max Elevation</p>
              <p className="text-lg font-semibold text-hwc-dark">{displayStats.max.toFixed(2)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Point</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Northing</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Easting</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Elevation</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPoints.slice(0, 50).map((point, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{point.point}</td>
                      <td className="px-4 py-3 text-gray-900">{point.northing.toFixed(3)}</td>
                      <td className="px-4 py-3 text-gray-900">{point.easting.toFixed(3)}</td>
                      <td className="px-4 py-3 text-gray-900">{point.elevation.toFixed(3)}</td>
                      <td className="px-4 py-3 text-gray-500">{point.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {displayPoints.length > 0 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing {Math.min(50, displayPoints.length)} of {displayTotalPoints?.toLocaleString() || displayPoints.length.toLocaleString()} processed points
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a3 3 0 003 3h0a3 3 0 003-3v-1m-6 0h6M9 17V7a3 3 0 013-3h0a3 3 0 013 3v10M9 17H7m8 0h2m-2 0V7m0 10v4m-6-4v4" />
          </svg>
          <p>No preview data available</p>
          <p className="text-sm mt-2">Process files to see preview</p>
        </div>
      )}
    </div>
  );
};