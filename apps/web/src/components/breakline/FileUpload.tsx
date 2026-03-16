import { useState, useCallback, useRef } from 'react';

const ALLOWED_EXT = ['.las', '.laz'];

interface Props {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function FileUpload({ files, onFilesChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXT.includes(ext);
    });
    if (valid.length) onFilesChange([...files, ...valid]);
  }, [files, onFilesChange]);

  const fmt = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
  };

  return (
    <div className="bl-card">
      <div className="bl-section-hdr">
        <span className="bl-step">1</span>
        <h2 className="bl-section-title">Select Point Cloud Files</h2>
      </div>

      <div
        className={`bl-dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXT.join(',')}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <svg className="bl-dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="bl-dropzone-title">Drag &amp; drop LAS/LAZ files</p>
        <p className="bl-dropzone-sub">or click to browse your computer</p>
        <span className="bl-btn bl-btn-primary">Select Files</span>
      </div>

      {files.length > 0 && (
        <div className="bl-file-list">
          <p className="bl-file-list-title">Selected Files ({files.length})</p>
          {files.map((f, i) => (
            <div key={i} className="bl-file-item">
              <div className="bl-file-info">
                <svg className="bl-file-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="bl-file-name" title={f.name}>{f.name}</div>
                  <div className="bl-file-size">{fmt(f.size)}</div>
                </div>
              </div>
              <button className="bl-file-remove" onClick={() => onFilesChange(files.filter((_, j) => j !== i))}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
