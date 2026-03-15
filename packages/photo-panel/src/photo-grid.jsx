import { useState, useEffect } from 'react';
import { FiCheck, FiSquare, FiDownload, FiTrash2, FiEdit3 } from 'react-icons/fi';
import { PhotoLightbox } from './photo-lightbox.jsx';

export function PhotoGrid({ 
  apiBaseUrl, 
  selectedPhotoIds = [], 
  onSelectionChange,
  highlightedPhotoId,
  onPhotoClick,
  refreshTrigger,
  onPhotosChange // Add callback for when photos are deleted/updated
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Fetch photos from API
  const fetchPhotos = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      console.log('PhotoGrid: Fetching photos from', `${apiBaseUrl}/photos?page=${pageNum}&limit=20`);
      const response = await fetch(`${apiBaseUrl}/photos?page=${pageNum}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch photos: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('PhotoGrid: Received photos data:', data);
      
      if (append) {
        setPhotos(prev => [...prev, ...data.Photos]);
      } else {
        setPhotos(data.Photos);
      }
      
      setTotalPages(data.pagination.pages);
      setHasMore(data.pagination.has_next);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refresh trigger
  useEffect(() => {
    console.log('PhotoGrid: refreshTrigger changed to:', refreshTrigger, 'apiBaseUrl:', apiBaseUrl);
    if (apiBaseUrl) {
      fetchPhotos(1, false);
    }
  }, [apiBaseUrl, refreshTrigger]);

  // Load more photos
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchPhotos(page + 1, true);
    }
  };

  // Selection handlers
  const isSelected = (photoId) => selectedPhotoIds.includes(photoId);
  
  const toggleSelection = (photoId) => {
    const newSelection = isSelected(photoId)
      ? selectedPhotoIds.filter(id => id !== photoId)
      : [...selectedPhotoIds, photoId];
    
    onSelectionChange?.(newSelection);
  };

  const selectAll = () => {
    const allIds = photos.map(photo => photo._id);
    onSelectionChange?.(allIds);
  };

  const clearSelection = () => {
    onSelectionChange?.([]);
  };

  const handlePhotoClick = (photo) => {
    const photoIndex = photos.findIndex(p => p._id === photo._id);
    setLightboxPhoto(photo);
    setCurrentPhotoIndex(photoIndex);
    setIsLightboxOpen(true);
  };

  const handleLightboxNavigate = (newIndex) => {
    if (newIndex >= 0 && newIndex < photos.length) {
      setCurrentPhotoIndex(newIndex);
      setLightboxPhoto(photos[newIndex]);
    }
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxPhoto(null);
    setCurrentPhotoIndex(0);
  };

  const handleLightboxEdit = (updatedPhoto) => {
    // Update the photo in the local state
    setPhotos(prev => prev.map(p => 
      p._id === updatedPhoto._id ? updatedPhoto : p
    ));
    onPhotosChange?.(); // Refresh map
  };

  const handleLightboxDelete = (deletedPhoto) => {
    // Remove photo from local state
    setPhotos(prev => prev.filter(p => p._id !== deletedPhoto._id));
    // Remove from selection if selected
    if (selectedPhotoIds.includes(deletedPhoto._id)) {
      onSelectionChange?.(selectedPhotoIds.filter(id => id !== deletedPhoto._id));
    }
    
    // Handle navigation after delete
    const newPhotos = photos.filter(p => p._id !== deletedPhoto._id);
    if (newPhotos.length === 0) {
      // No more photos, close lightbox
      closeLightbox();
    } else if (currentPhotoIndex >= newPhotos.length) {
      // Current index is out of bounds, go to last photo
      const newIndex = newPhotos.length - 1;
      setCurrentPhotoIndex(newIndex);
      setLightboxPhoto(newPhotos[newIndex]);
    } else {
      // Stay at current index, but update photo
      setLightboxPhoto(newPhotos[currentPhotoIndex]);
    }
    
    onPhotosChange?.(); // Refresh map
  };

  // Batch action handlers
  const handleBatchDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedPhotoIds.length} photo(s)? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      // Delete each selected photo
      const deletePromises = selectedPhotoIds.map(async (photoId) => {
        const response = await fetch(`${apiBaseUrl}/photos/${photoId}/delete`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete photo ${photoId}: ${response.statusText}`);
        }
        
        return response.json();
      });

      const results = await Promise.all(deletePromises);
      console.log('Batch delete results:', results);
      
      // Remove deleted photos from local state immediately
      const deletedIds = selectedPhotoIds.filter((_, index) => {
        // Only remove if the delete was successful
        try {
          return results[index] && results[index].Message;
        } catch {
          return false;
        }
      });
      
      setPhotos(prev => prev.filter(photo => !deletedIds.includes(photo._id)));
      
      // Clear selection and refresh
      onSelectionChange?.([]);
      onPhotosChange?.(); // Notify parent to refresh map
      
      if (deletedIds.length === selectedPhotoIds.length) {
        alert(`Successfully deleted ${deletedIds.length} photo(s)`);
      } else {
        alert(`Deleted ${deletedIds.length} of ${selectedPhotoIds.length} photo(s). Some deletions may have failed.`);
        // Refresh to get current state
        fetchPhotos(1, false);
      }
    } catch (error) {
      console.error('Error deleting photos:', error);
      alert(`Error deleting photos: ${error.message}`);
      // Refresh the photo list to get current state
      fetchPhotos(1, false);
    }
  };

  const handleBatchExport = () => {
    if (selectedPhotoIds.length === 0) return;
    
    // Create export URL with selected photo IDs
    const exportUrl = `${apiBaseUrl}/export/zip?${selectedPhotoIds.map(id => `payload=${id}`).join('&')}`;
    
    // Trigger download
    window.open(exportUrl, '_blank');
  };

  const handleBatchEditTags = () => {
    if (selectedPhotoIds.length === 0) return;
    
    const newTags = prompt(
      `Enter tags for ${selectedPhotoIds.length} photo(s) (comma-separated):`,
      ''
    );
    
    if (newTags === null) return; // User cancelled
    
    // TODO: Implement batch tag editing
    // This would require a new API endpoint for batch updates
    alert('Batch tag editing coming soon!');
  };

  if (loading && photos.length === 0) {
    return (
      <div className="photo-grid-loading">
        <div className="loading-spinner" />
        <p>Loading photos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="photo-grid-error">
        <p>Error loading photos: {error}</p>
        <button 
          className="panel-button"
          onClick={() => fetchPhotos(1, false)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="photo-grid-empty">
        <p className="empty-message">No photos found. Upload some photos to get started!</p>
      </div>
    );
  }

  return (
    <div className="photo-grid-container">
      {/* Selection Controls */}
      <div className="photo-grid-controls">
        <div className="selection-info">
          <span>{selectedPhotoIds.length} of {photos.length} selected</span>
        </div>
        
        <div className="selection-buttons">
          <button 
            className="control-btn-small"
            onClick={selectAll}
            disabled={selectedPhotoIds.length === photos.length}
          >
            Select All
          </button>
          <button 
            className="control-btn-small"
            onClick={clearSelection}
            disabled={selectedPhotoIds.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedPhotoIds.length > 0 && (
        <div className="batch-actions">
          <button 
            className="batch-btn export-btn"
            onClick={handleBatchExport}
            title="Export selected photos as ZIP"
          >
            <FiDownload />
            Export ({selectedPhotoIds.length})
          </button>
          <button 
            className="batch-btn edit-btn"
            onClick={handleBatchEditTags}
            title="Edit tags for selected photos"
          >
            <FiEdit3 />
            Edit Tags
          </button>
          <button 
            className="batch-btn delete-btn"
            onClick={handleBatchDelete}
            title="Delete selected photos"
          >
            <FiTrash2 />
            Delete
          </button>
        </div>
      )}

      {/* Photo Grid */}
      <div className="photo-grid">
        {photos.map(photo => (
          <PhotoGridItem
            key={photo._id}
            photo={photo}
            isSelected={isSelected(photo._id)}
            isHighlighted={photo._id === highlightedPhotoId}
            onToggleSelection={() => toggleSelection(photo._id)}
            onClick={() => handlePhotoClick(photo)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="load-more-container">
          <button 
            className="panel-button load-more-btn"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : `Load More (${totalPages - page} pages remaining)`}
          </button>
        </div>
      )}

      {/* Photo Lightbox */}
      <PhotoLightbox
        photo={lightboxPhoto}
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
        onDelete={handleLightboxDelete}
        onEdit={handleLightboxEdit}
        apiBaseUrl={apiBaseUrl}
        photos={photos}
        currentIndex={currentPhotoIndex}
        onNavigate={handleLightboxNavigate}
      />
    </div>
  );
}

function PhotoGridItem({ photo, isSelected, isHighlighted, onToggleSelection, onClick }) {
  const thumbnailUrl = photo.thumbnail || photo.url || '/placeholder-image.jpg';
  
  return (
    <div 
      className={`photo-grid-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
    >
      {/* Selection Checkbox */}
      <button 
        className="photo-checkbox"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelection();
        }}
      >
        {isSelected ? <FiCheck /> : <FiSquare />}
      </button>

      {/* Photo Thumbnail */}
      <div 
        className="photo-thumbnail"
        onClick={onClick}
      >
        <img 
          src={thumbnailUrl}
          alt={photo.filename || 'Photo'}
          loading="lazy"
        />
        
        {/* Selection Overlay */}
        {isSelected && <div className="selection-overlay" />}
        
        {/* Highlight Border */}
        {isHighlighted && <div className="highlight-border" />}
      </div>

      {/* Photo Info */}
      <div className="photo-info">
        <span className="photo-filename">{photo.filename}</span>
        {photo.timestamp && (
          <span className="photo-date">
            {new Date(photo.timestamp).toLocaleDateString()}
          </span>
        )}
        {photo.tags && photo.tags.length > 0 && (
          <div className="photo-tags">
            {photo.tags.slice(0, 2).map(tag => (
              <span key={tag} className="photo-tag">{tag}</span>
            ))}
            {photo.tags.length > 2 && (
              <span className="photo-tag-more">+{photo.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}