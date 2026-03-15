import React from 'react';
import { JobStatus } from '../../types';

interface ProgressIndicatorProps {
  stage: 'upload' | 'processing' | 'completed' | 'failed';
  uploadProgress?: number;
  jobStatus?: JobStatus;
  jobProgress?: number;
  totalFiles?: number;
  currentFile?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  stage,
  uploadProgress = 0,
  jobStatus,
  jobProgress = 0,
  totalFiles,
  currentFile,
}) => {
  const getStageProgress = () => {
    switch (stage) {
      case 'upload':
        return uploadProgress;
      case 'processing':
        // Show indeterminate progress if backend doesn't provide progress
        return jobProgress > 0 ? jobProgress : null;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  const getStatusColor = () => {
    switch (stage) {
      case 'upload':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = () => {
    switch (stage) {
      case 'upload':
        return `Uploading files... ${uploadProgress}%`;
      case 'processing':
        if (currentFile && totalFiles && totalFiles > 1) {
          return `Processing ${totalFiles} files...`;
        }
        return jobProgress > 0 ? `Processing... ${jobProgress}%` : 'Processing...';
      case 'completed':
        return 'Processing completed!';
      case 'failed':
        return 'Processing failed';
      default:
        return '';
    }
  };

  const progress = getStageProgress();
  const isIndeterminate = progress === null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${stage === 'processing' ? 'animate-pulse' : ''} ${getStatusColor()}`}></div>
          <span className="text-sm font-medium text-gray-900">{getStatusText()}</span>
        </div>
        {!isIndeterminate && <span className="text-sm text-gray-500">{Math.round(progress || 0)}%</span>}
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        {isIndeterminate ? (
          /* Indeterminate progress bar animation */
          <div className="h-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 animate-pulse"></div>
        ) : (
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          ></div>
        )}
      </div>

      {/* Status Details */}
      <div className="mt-3 text-xs text-gray-500">
        {jobStatus === 'queued' && 'Job queued for processing...'}
        {stage === 'processing' && jobStatus === 'processing' && (
          <>
            Processing point cloud data
            {totalFiles && totalFiles > 1 && ` (${totalFiles} files)`}
          </>
        )}
        {stage === 'completed' && 'All files processed successfully!'}
        {stage === 'failed' && 'Processing encountered an error'}
      </div>
    </div>
  );
};