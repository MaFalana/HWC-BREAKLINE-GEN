import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaChevronLeft, FaXmark } from 'react-icons/fa6';
import { ToolsSection } from './ToolsSection';
import { AppearanceSection } from './AppearanceSection';
import { CameraSection } from './CameraSection';
import { SceneSection } from './SceneSection';
import { ExportSection } from './ExportSection';
import './panel.css';

export function PotreePanel({ potreeViewer, cesiumViewer, isOpen, onToggle }) {
  const [expandedSections, setExpandedSections] = useState({
    tools: true,
    appearance: false,
    camera: false,
    scene: false,
    export: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) {
    return (
      <button 
        className="potree-panel-toggle collapsed"
        onClick={onToggle}
        aria-label="Open tools panel"
        title="Open Tools"
      >
        <FaChevronLeft />
      </button>
    );
  }

  return (
    <div className="potree-panel">
      <div className="potree-panel-header">
        <h3>Point Cloud Tools</h3>
        <button 
          className="potree-panel-close"
          onClick={onToggle}
          aria-label="Close panel"
        >
          <FaXmark />
        </button>
      </div>

      <div className="potree-panel-content">
        {/* Tools Section */}
        <PanelSection
          title="Tools"
          iconPath="distance"
          isExpanded={expandedSections.tools}
          onToggle={() => toggleSection('tools')}
        >
          <ToolsSection potreeViewer={potreeViewer} />
        </PanelSection>

        {/* Appearance Section */}
        <PanelSection
          title="Appearance"
          iconPath="eye"
          isExpanded={expandedSections.appearance}
          onToggle={() => toggleSection('appearance')}
        >
          <AppearanceSection potreeViewer={potreeViewer} />
        </PanelSection>

        {/* Camera Section */}
        <PanelSection
          title="Camera"
          iconPath="perspective-camera"
          isExpanded={expandedSections.camera}
          onToggle={() => toggleSection('camera')}
        >
          <CameraSection potreeViewer={potreeViewer} />
        </PanelSection>

        {/* Scene Section */}
        <PanelSection
          title="Scene"
          iconPath="cloud"
          isExpanded={expandedSections.scene}
          onToggle={() => toggleSection('scene')}
        >
          <SceneSection potreeViewer={potreeViewer} />
        </PanelSection>

        {/* Export Section */}
        <PanelSection
          title="Export & Share"
          iconPath="picture"
          isExpanded={expandedSections.export}
          onToggle={() => toggleSection('export')}
        >
          <ExportSection potreeViewer={potreeViewer} cesiumViewer={cesiumViewer} />
        </PanelSection>
      </div>
    </div>
  );
}

function PanelSection({ title, iconPath, isExpanded, onToggle, children }) {
  return (
    <div className="panel-section">
      <button 
        className="panel-section-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="panel-section-title">
          <img 
            src={`/potree/1.8.2/build/potree/resources/icons/${iconPath}.svg`}
            alt={title}
            className="panel-section-icon"
          />
          <span>{title}</span>
        </div>
        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      
      {isExpanded && (
        <div className="panel-section-content">
          {children}
        </div>
      )}
    </div>
  );
}
