import React, { useState, useRef } from 'react';
import { MdUploadFile, MdClear } from 'react-icons/md';
import './file-drop-zone.css';

/**
 * FileDropZone - Unified file upload component
 * Supports both drag-and-drop and paste functionality
 * 
 * @param {Object} props
 * @param {string[]} props.acceptedFormats - Array of accepted file extensions (e.g., ['.txt', '.csv', '.xlsx'])
 * @param {number} props.maxSizeMB - Maximum file size in megabytes
 * @param {Function} props.onFileSelect - Callback when file is selected (file) => void
 * @param {Function} props.onTextPaste - Callback when text is pasted (text) => void
 * @param {Function} props.onClear - Callback when file/text is cleared
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether the component is disabled
 */
export function FileDropZone({
  acceptedFormats = [],
  maxSizeMB = 5,
  onFileSelect,
  onTextPaste,
  onClear,
  placeholder = 'Drop a file here or paste text',
  disabled = false
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file) => {
    // Check file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (acceptedFormats.length > 0 && !acceptedFormats.includes(ext)) {
      return `Invalid file type. Accepted: ${acceptedFormats.join(', ')}`;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size: ${maxSizeMB}GB`;
    }

    return null;
  };

  const handleFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setFile(file);
    setPastedText('');
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setPastedText(text);
    setFile(null);
    setError('');
    
    if (onTextPaste && text.trim()) {
      onTextPaste(text);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPastedText('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClear) {
      onClear();
    }
  };

  const handleClick = () => {
    if (!disabled && !file && !pastedText) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="file-drop-zone-container">
      <div
        className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />

        {file ? (
          <div className="file-info">
            <MdUploadFile className="file-icon" />
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                className="clear-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <MdClear />
              </button>
            )}
          </div>
        ) : (
          <div className="drop-zone-content">
            <MdUploadFile className="upload-icon" />
            {onTextPaste ? (
              <>
                <textarea
                  ref={textAreaRef}
                  className="paste-area"
                  placeholder={placeholder}
                  value={pastedText}
                  onChange={handleTextChange}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                />
                {pastedText && !disabled && (
                  <button
                    type="button"
                    className="clear-button-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  >
                    <MdClear />
                  </button>
                )}
              </>
            ) : (
              <p className="drop-zone-text">{placeholder}</p>
            )}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
