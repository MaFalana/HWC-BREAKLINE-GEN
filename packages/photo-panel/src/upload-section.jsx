import { useState, useRef, useEffect } from 'react';
import { FiUpload, FiX, FiCheck, FiAlertCircle, FiCamera } from 'react-icons/fi';

export function UploadSection({ apiBaseUrl, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => {
      // Check file type and extension for broader compatibility
      const isImageType = file.type.startsWith('image/');
      const isHeicFile = file.name.toLowerCase().match(/\.(heic|heif)$/);
      const hasValidExtension = file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic|heif)$/);
      
      return isImageType || isHeicFile || hasValidExtension;
    });
    
    if (imageFiles.length === 0) {
      alert('Please select image files only');
      return;
    }

    // Check for large files (Android can have issues with very large files)
    const oversizedFiles = imageFiles.filter(file => file.size > 50 * 1024 * 1024); // 50MB limit
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      alert(`These files are too large (>50MB): ${fileNames}`);
      return;
    }

    const newUploads = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      error: null
    }));

    setUploads(prev => [...prev, ...newUploads]);
  };

  const uploadFiles = async () => {
    const pendingUploads = uploads.filter(upload => upload.status === 'pending');
    
    if (pendingUploads.length === 0) return;

    for (const upload of pendingUploads) {
      try {
        // Update status to uploading
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'uploading', progress: 0 } : u
        ));

        const formData = new FormData();
        formData.append('file', upload.file);
        if (description.trim()) {
          formData.append('description', description.trim());
        }
        if (tags.trim()) {
          formData.append('tags', tags.trim());
        }

        const response = await fetch(`${apiBaseUrl}/photos/upload`, {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - let browser set it with boundary for multipart
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Update status to success
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'success', progress: 100 } : u
        ));

      } catch (error) {
        // Update status to error
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { 
            ...u, 
            status: 'error', 
            progress: 0, 
            error: error.message 
          } : u
        ));
      }
    }

    // Call completion callback
    const successCount = uploads.filter(u => u.status === 'success').length;
    if (successCount > 0 && onUploadComplete) {
      onUploadComplete(successCount);
    }
  };

  const removeUpload = (id) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status === 'pending' || u.status === 'uploading'));
  };

  const hasUploads = uploads.length > 0;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  const isUploading = uploadingCount > 0;

  return (
    <div className="upload-section">
      {/* Mobile Upload Buttons */}
      {isMobile ? (
        <div className="mobile-upload-buttons">
          <button 
            className="mobile-upload-btn camera-btn"
            onClick={openCamera}
            type="button"
          >
            <FiCamera size={20} />
            <span>Take Photo</span>
          </button>
          <button 
            className="mobile-upload-btn gallery-btn"
            onClick={openGallery}
            type="button"
          >
            <FiUpload size={20} />
            <span>Choose Photos</span>
          </button>
        </div>
      ) : (
        /* Desktop Drop Zone */
        <div 
          className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <FiUpload size={24} />
          <p>Drop photos here or click to select</p>
          <span className="upload-hint">Supports JPG, PNG, HEIC formats</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.HEIC"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* Camera input for mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Metadata Inputs */}
      <div className="upload-metadata">
        <div className="upload-field">
          <label>Description (optional)</label>
          <input
            type="text"
            className="panel-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description for all photos"
          />
        </div>

        <div className="upload-field">
          <label>Tags (optional)</label>
          <input
            type="text"
            className="panel-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2, tag3"
          />
        </div>
      </div>

      {/* Upload Queue */}
      {hasUploads && (
        <div className="upload-queue">
          <div className="upload-queue-header">
            <span>{uploads.length} file(s) selected</span>
            {uploads.some(u => u.status === 'success' || u.status === 'error') && (
              <button 
                className="upload-clear-btn"
                onClick={clearCompleted}
                type="button"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="upload-list">
            {uploads.map(upload => (
              <UploadItem 
                key={upload.id}
                upload={upload}
                onRemove={() => removeUpload(upload.id)}
              />
            ))}
          </div>

          {pendingCount > 0 && (
            <button 
              className="panel-button upload-start-btn"
              onClick={uploadFiles}
              disabled={isUploading}
            >
              <FiUpload />
              {isUploading ? `Uploading... (${uploadingCount})` : `Upload ${pendingCount} photo(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UploadItem({ upload, onRemove }) {
  const getStatusIcon = () => {
    switch (upload.status) {
      case 'success':
        return <FiCheck className="upload-status-icon success" />;
      case 'error':
        return <FiAlertCircle className="upload-status-icon error" />;
      case 'uploading':
        return <div className="upload-spinner" />;
      default:
        return null;
    }
  };

  return (
    <div className={`upload-item ${upload.status}`}>
      <div className="upload-item-info">
        <span className="upload-filename">{upload.file.name}</span>
        <span className="upload-filesize">
          {(upload.file.size / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>

      <div className="upload-item-status">
        {getStatusIcon()}
        {upload.status === 'pending' && (
          <button 
            className="upload-remove-btn"
            onClick={onRemove}
            type="button"
          >
            <FiX />
          </button>
        )}
      </div>

      {upload.status === 'uploading' && (
        <div className="upload-progress">
          <div 
            className="upload-progress-bar"
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      )}

      {upload.error && (
        <div className="upload-error">
          {upload.error}
        </div>
      )}
    </div>
  );
}