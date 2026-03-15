import './photo-panel.css';
import { useState } from 'react';
import { HwcPanel, PanelSection } from '@hwc/panel';
import { FiUpload, FiFilter, FiImage } from 'react-icons/fi';
import { UploadSection } from './upload-section.jsx';
import { PhotoGrid } from './photo-grid.jsx';

export function PhotoPanel({ 
  isOpen, 
  onToggle, 
  apiBaseUrl,
  title = "Photo Manager",
  position = "left", // "left" or "right"
  onPhotosChange,
  selectedPhotoIds = [],
  onSelectionChange,
  highlightedPhotoId,
  onPhotoClick,
  refreshTrigger = 0
}) {
  const [expandedSections, setExpandedSections] = useState({
    upload: false,
    filters: false,
    photos: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUploadComplete = (count) => {
    console.log(`${count} photos uploaded successfully`);
    // Notify parent to refresh both photo grid and map
    if (onPhotosChange) {
      onPhotosChange();
    }
  };

  return (
    <HwcPanel
      isOpen={isOpen}
      onToggle={onToggle}
      title={title}
      position={position}
      toggleLabel="Open Photo Manager"
    >
      {/* Upload Section */}
      <PanelSection
        title="Upload Photos"
        icon={<FiUpload />}
        isExpanded={expandedSections.upload}
        onToggle={() => toggleSection('upload')}
      >
        <UploadSection 
          apiBaseUrl={apiBaseUrl}
          onUploadComplete={handleUploadComplete}
        />
      </PanelSection>

      {/* Filters Section */}
      <PanelSection
        title="Filters"
        icon={<FiFilter />}
        isExpanded={expandedSections.filters}
        onToggle={() => toggleSection('filters')}
      >
        <div className="filter-placeholder">
          <p className="empty-message">Filters coming soon...</p>
        </div>
      </PanelSection>

      {/* Photos Section (includes batch actions) */}
      <PanelSection
        title="Photos & Actions"
        icon={<FiImage />}
        isExpanded={expandedSections.photos}
        onToggle={() => toggleSection('photos')}
      >
        <PhotoGrid
          apiBaseUrl={apiBaseUrl}
          selectedPhotoIds={selectedPhotoIds}
          onSelectionChange={onSelectionChange}
          highlightedPhotoId={highlightedPhotoId}
          onPhotoClick={onPhotoClick}
          refreshTrigger={refreshTrigger}
          onPhotosChange={onPhotosChange}
        />
      </PanelSection>
    </HwcPanel>
  );
}