import { useState } from 'react';
import { HwcPotree, PotreeControls, PotreePanel } from '@hwc/potree';

export function PotreeViewer({ project, mapTilerKey }) {
  const [viewers, setViewers] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <HwcPotree
        pointCloudUrl={project.cloud?.url}
        name={project.name}
        location={project.location}
        crs={project.crs}
        baseLayer="satellite"
        mapTilerKey={mapTilerKey}
        onViewerReady={setViewers}
      />

      {viewers && (
        <>
          <PotreeControls
            potreeViewer={viewers.potreeViewer}
            cesiumViewer={viewers.cesiumViewer}
          />
          
          <PotreePanel
            potreeViewer={viewers.potreeViewer}
            cesiumViewer={viewers.cesiumViewer}
            isOpen={isPanelOpen}
            onToggle={() => setIsPanelOpen(!isPanelOpen)}
            position="left"
          />
        </>
      )}
    </div>
  );
}
