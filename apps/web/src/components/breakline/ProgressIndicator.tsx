import type { JobStatus } from '../../types';

interface Props {
  stage: 'upload' | 'processing' | 'completed' | 'failed';
  uploadProgress?: number;
  jobStatus?: JobStatus;
  jobProgress?: number;
  totalFiles?: number;
  currentFile?: string;
}

export function ProgressIndicator({ stage, uploadProgress = 0, jobStatus, jobProgress = 0, totalFiles }: Props) {
  const progress = stage === 'upload' ? uploadProgress
    : stage === 'completed' ? 100
    : stage === 'failed' ? 0
    : jobProgress > 0 ? jobProgress : null;

  const text = stage === 'upload' ? `Uploading files... ${uploadProgress}%`
    : stage === 'completed' ? 'Processing completed!'
    : stage === 'failed' ? 'Processing failed'
    : jobProgress > 0 ? `Processing... ${jobProgress}%` : 'Processing...';

  const detail = jobStatus === 'queued' ? 'Job queued for processing...'
    : stage === 'processing' ? `Processing point cloud data${totalFiles && totalFiles > 1 ? ` (${totalFiles} files)` : ''}`
    : stage === 'completed' ? 'All files processed successfully!'
    : stage === 'failed' ? 'Processing encountered an error' : '';

  return (
    <div className="bl-progress">
      <div className="bl-progress-header">
        <div className="bl-progress-status">
          <span className={`bl-progress-dot ${stage}`} />
          <span className="bl-progress-text">{text}</span>
        </div>
        {progress !== null && <span className="bl-progress-pct">{Math.round(progress)}%</span>}
      </div>
      <div className="bl-progress-bar">
        {progress !== null ? (
          <div className={`bl-progress-fill ${stage}`} style={{ width: `${progress}%` }} />
        ) : (
          <div className={`bl-progress-fill processing`} style={{ width: '100%', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
        )}
      </div>
      {detail && <div className="bl-progress-detail">{detail}</div>}
    </div>
  );
}
