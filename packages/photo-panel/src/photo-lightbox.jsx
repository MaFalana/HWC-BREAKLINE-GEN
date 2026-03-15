import { useState, useEffect } from 'react';
import { FiX, FiEdit3, FiTrash2, FiDownload, FiMapPin, FiCalendar, FiTag, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export function PhotoLightbox({ 
  photo, 
  isOpen, 
  onClose, 
  onDelete, 
  onEdit,
  apiBaseUrl,
  // Navigation props
  photos = [], // Array of all photos for navigation
  currentIndex = 0, // Current photo index
  onNavigate // Callback when navigating to different photo
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(photo?.description || '');
  const [editTags, setEditTags] = useState(photo?.tags?.join(', ') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update edit fields when photo changes
  useEffect(() => {
    if (photo) {
      setEditDescription(photo.description || '');
      setEditTags(photo.tags?.join(', ') || '');
      setImageLoading(true); // Start loading new image
    }
  }, [photo]);

  // Handle escape key and arrow navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, currentIndex, photos.length]);

  if (!isOpen || !photo) return null;

  // Navigation functions
  const navigatePrevious = () => {
    if (currentIndex > 0 && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  };

  const navigateNext = () => {
    if (currentIndex < photos.length - 1 && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  };

  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext = currentIndex < photos.length - 1;
  const showNavigation = photos.length > 1;

  const handleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    // Save changes
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('description', editDescription);
      formData.append('tags', editTags);

      const response = await fetch(`${apiBaseUrl}/photos/${photo._id}/update`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update photo: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Update result:', result);

      // Update local photo object
      const updatedPhoto = {
        ...photo,
        description: editDescription,
        tags: editTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      setIsEditing(false);
      onEdit?.(updatedPhoto);
      
    } catch (error) {
      console.error('Error updating photo:', error);
      alert(`Failed to update photo: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete this photo? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${apiBaseUrl}/photos/${photo._id}/delete`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete photo: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Delete result:', result);

      onDelete?.(photo);
      onClose();
      
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert(`Failed to delete photo: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (photo.url) {
      window.open(photo.url, '_blank');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatLocation = (location) => {
    if (!location || !location.lat || !location.lon) return 'No GPS data';
    return `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}${location.z ? ` (${Math.round(location.z)}ft)` : ''}`;
  };

  return (
    <div className={`photo-lightbox-overlay ${isMobile ? 'mobile' : ''}`} onClick={onClose}>
      <div className="photo-lightbox" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="photo-lightbox-header">
          <div className="photo-lightbox-title-section">
            <h3 className="photo-lightbox-title">{photo.filename}</h3>
            {showNavigation && (
              <span className="photo-counter">
                {currentIndex + 1} of {photos.length}
              </span>
            )}
          </div>
          <div className="photo-lightbox-actions">
            <button 
              className="lightbox-btn"
              onClick={handleEdit}
              disabled={isLoading}
              title={isEditing ? 'Save changes' : 'Edit photo'}
            >
              <FiEdit3 />
            </button>
            <button 
              className="lightbox-btn"
              onClick={handleDownload}
              title="Download original"
            >
              <FiDownload />
            </button>
            <button 
              className="lightbox-btn delete-btn"
              onClick={handleDelete}
              disabled={isLoading}
              title="Delete photo"
            >
              <FiTrash2 />
            </button>
            <button 
              className="lightbox-btn close-btn"
              onClick={onClose}
              title="Close"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Photo */}
        <div className="photo-lightbox-image">
          {imageLoading && (
            <div className="image-loading-spinner">
              <div className="loading-spinner" />
            </div>
          )}
          <img 
            src={photo.url || photo.thumbnail} 
            alt={photo.filename}
            loading="lazy"
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            style={{ opacity: imageLoading ? 0.5 : 1 }}
          />
          
          {/* Navigation Arrows - positioned relative to image */}
          {showNavigation && (
            <>
              <button 
                className={`photo-nav-btn photo-nav-prev ${!canNavigatePrevious ? 'disabled' : ''}`}
                onClick={navigatePrevious}
                disabled={!canNavigatePrevious}
                title="Previous photo (← or Left Arrow)"
              >
                <FiChevronLeft />
              </button>
              <button 
                className={`photo-nav-btn photo-nav-next ${!canNavigateNext ? 'disabled' : ''}`}
                onClick={navigateNext}
                disabled={!canNavigateNext}
                title="Next photo (→ or Right Arrow)"
              >
                <FiChevronRight />
              </button>
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="photo-lightbox-metadata">
          {/* Description */}
          <div className="metadata-section">
            <label>Description:</label>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                className="edit-textarea"
                rows={3}
              />
            ) : (
              <p className="metadata-value">
                {photo.description || 'No description'}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="metadata-section">
            <label>
              <FiTag />
              Tags:
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="edit-input"
              />
            ) : (
              <div className="metadata-tags">
                {photo.tags && photo.tags.length > 0 ? (
                  photo.tags.map(tag => (
                    <span key={tag} className="metadata-tag">{tag}</span>
                  ))
                ) : (
                  <span className="metadata-value">No tags</span>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="metadata-section">
            <label>
              <FiCalendar />
              Date:
            </label>
            <p className="metadata-value">{formatDate(photo.timestamp)}</p>
          </div>

          {/* Location */}
          <div className="metadata-section">
            <label>
              <FiMapPin />
              Location:
            </label>
            <p className="metadata-value">{formatLocation(photo.location)}</p>
          </div>

          {/* File Info */}
          <div className="metadata-section">
            <label>File Info:</label>
            <div className="metadata-file-info">
              {photo.size && (
                <span>{photo.size.width} × {photo.size.height}</span>
              )}
              {photo.size_bytes && (
                <span>{(photo.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
              )}
              {photo.content_type && (
                <span>{photo.content_type}</span>
              )}
            </div>
          </div>
        </div>

        {/* Save/Cancel buttons when editing */}
        {isEditing && (
          <div className="photo-lightbox-edit-actions">
            <button 
              className="panel-button save-btn"
              onClick={handleEdit}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              className="panel-button cancel-btn"
              onClick={() => {
                setIsEditing(false);
                setEditDescription(photo.description || '');
                setEditTags(photo.tags?.join(', ') || '');
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}