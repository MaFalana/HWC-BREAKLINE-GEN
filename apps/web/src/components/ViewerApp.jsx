import { useState } from 'react';
import { HwcMap, ImageOrthoLayer } from '@hwc/map';
import { HwcPotree, PotreeControls, PotreePanel } from '@hwc/potree';

export function ViewerApp({ project, mapTilerKey }) {
  const [mode, setMode] = useState('3d');
  const [viewers, setViewers] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [baseLayer, setBaseLayer] = useState('satellite');
  const [orthoOpacity, setOrthoOpacity] = useState(0.9);
  const [orthoBounds, setOrthoBounds] = useState(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Mode Toggle (2D/3D) */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === '2d' ? 'active' : ''}`}
          onClick={() => setMode('2d')}
          aria-label="2D view"
          title="2D Map View"
        >
          2D
        </button>
        <button
          className={`mode-btn ${mode === '3d' ? 'active' : ''}`}
          onClick={() => setMode('3d')}
          aria-label="3D view"
          title="3D Point Cloud View"
        >
          3D
        </button>
      </div>

      {/* Layer Toggle (Streets/Satellite) */}
      <div className="layer-toggles">
        <button
          onClick={() => setBaseLayer('streets')}
          className="layer-btn"
          aria-label="Street view"
          aria-checked={baseLayer === 'streets'}
          title="Street Map"
        >
          <img src="/assets/streets.png" alt="Street view" />
          <span className="active-dot" />
        </button>

        <button
          onClick={() => setBaseLayer('satellite')}
          className="layer-btn"
          aria-label="Satellite view"
          aria-checked={baseLayer === 'satellite'}
          title="Satellite Imagery"
        >
          <img src="/assets/satellite.png" alt="Satellite view" />
          <span className="active-dot" />
        </button>
      </div>

      {/* 2D Mode */}
      {mode === '2d' && (
        <>
          <HwcMap
            items={[]} // No markers in viewer mode
            initialCenter={[project.location.lat, project.location.lon]}
            initialZoom={18}
            baseLayer={baseLayer}
            onBaseLayerChange={setBaseLayer}
            mapTilerKey={mapTilerKey}
            fitBoundsOnLoad={false}
            orthoBounds={orthoBounds}
          >
            {/* Optional ortho overlay */}
            {project.ortho?.url && (
              <ImageOrthoLayer 
                url={project.ortho.url}
                bounds={project.ortho.bounds}
                pointCloudBounds={project.cloud?.bounds}
                crs={project.crs}
                opacity={orthoOpacity}
                onLoad={(data) => {
                  console.log('Ortho loaded:', data);
                  setOrthoBounds(data.bounds);
                }}
                onError={(error) => console.error('Ortho error:', error)}
              />
            )}
          </HwcMap>

          {/* Ortho opacity control */}
          {project.ortho?.url && (
            <div className="ortho-opacity-control">
              <label>
                <span>Ortho Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={orthoOpacity * 100}
                  onChange={(e) => setOrthoOpacity(e.target.value / 100)}
                />
                <span className="opacity-value">{Math.round(orthoOpacity * 100)}%</span>
              </label>
            </div>
          )}
        </>
      )}

      {/* 3D Mode */}
      {mode === '3d' && (
        <>
          <HwcPotree
            pointCloudUrl={project.cloud?.url}
            name={project.name}
            location={project.location}
            crs={project.crs}
            baseLayer={baseLayer}
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
        </>
      )}
    </div>
  );
}
