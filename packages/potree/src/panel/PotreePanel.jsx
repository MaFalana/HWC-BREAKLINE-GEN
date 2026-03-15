import { useState } from 'react';
import { HwcPanel, PanelSection } from '@hwc/panel';
import { ToolsSection } from './ToolsSection';
import { AppearanceSection } from './AppearanceSection';
import { CameraSection } from './CameraSection';
import { SceneSection } from './SceneSection';
import { ExportSection } from './ExportSection';
import './panel.css';

// Potree icon helper
const PotreeIcon = ({ name }) => (
  <img 
    src={`/potree/1.8.2/build/potree/resources/icons/${name}.svg`}
    alt={name}
    className="panel-section-icon"
  />
);

export function PotreePanel({ 
  potreeViewer, 
  cesiumViewer, 
  isOpen, 
  onToggle,
  position = "left",
  title = "Point Cloud Tools"
}) {
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

  return (
    <HwcPanel
      isOpen={isOpen}
      onToggle={onToggle}
      title={title}
      position={position}
      toggleLabel="Open Point Cloud Tools"
    >
      {/* Tools Section */}
      <PanelSection
        title="Tools"
        icon={<PotreeIcon name="distance" />}
        isExpanded={expandedSections.tools}
        onToggle={() => toggleSection('tools')}
      >
        <ToolsSection potreeViewer={potreeViewer} />
      </PanelSection>

      {/* Appearance Section */}
      <PanelSection
        title="Appearance"
        icon={<PotreeIcon name="eye" />}
        isExpanded={expandedSections.appearance}
        onToggle={() => toggleSection('appearance')}
      >
        <AppearanceSection potreeViewer={potreeViewer} />
      </PanelSection>

      {/* Camera Section */}
      <PanelSection
        title="Camera"
        icon={<PotreeIcon name="perspective-camera" />}
        isExpanded={expandedSections.camera}
        onToggle={() => toggleSection('camera')}
      >
        <CameraSection potreeViewer={potreeViewer} />
      </PanelSection>

      {/* Scene Section */}
      <PanelSection
        title="Scene"
        icon={<PotreeIcon name="cloud" />}
        isExpanded={expandedSections.scene}
        onToggle={() => toggleSection('scene')}
      >
        <SceneSection potreeViewer={potreeViewer} />
      </PanelSection>

      {/* Export Section */}
      <PanelSection
        title="Export & Share"
        icon={<PotreeIcon name="picture" />}
        isExpanded={expandedSections.export}
        onToggle={() => toggleSection('export')}
      >
        <ExportSection potreeViewer={potreeViewer} cesiumViewer={cesiumViewer} />
      </PanelSection>
    </HwcPanel>
  );
}
