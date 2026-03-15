import { useState, useRef, useEffect } from 'react';
import { Viewer3D } from './Viewer3D';
import { Viewer2D } from './Viewer2D';
import { ModeToggle, LayerToggle, ViewerZoomControls } from './ViewerControls';
import { PotreePanel } from './Panel/PotreePanel';
import { ViewerHeader } from './ViewerHeader';
import { projectAPI } from '../../api/index.js';
import '../../styles/global.css';

export function PotreeViewer({ project: projectProp, projectId: projectIdProp, initialMode = '3d', onStateChange = null }) {
  const [project, setProject] = useState(projectProp || null);
  const [loading, setLoading] = useState(!projectProp);
  const [error, setError] = useState(null);
  const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_KEY || '';
  const [mode, setMode] = useState(initialMode);
  const [baseLayer, setBaseLayer] = useState('satellite');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const viewersRef = useRef({ cesiumViewer: null, potreeViewer: null });
  const mapRef = useRef(null);

  // Extract project ID from URL if not provided as prop
  const getProjectIdFromUrl = () => {
    if (typeof window === 'undefined') return null;
    const pathParts = window.location.pathname.split('/');
    const viewIndex = pathParts.indexOf('view');
    return viewIndex !== -1 && pathParts[viewIndex + 1] ? pathParts[viewIndex + 1] : null;
  };

  const projectId = projectIdProp || getProjectIdFromUrl();

  // Fetch project data if projectId is available but project is not
  useEffect(() => {
    if (!project && projectId) {
      const fetchProject = async () => {
        try {
          setLoading(true);
          const data = await projectAPI.getById(projectId);
          setProject(data);
          setError(null);
        } catch (err) {
          console.error('Failed to fetch project:', err);
          setError(err.message || 'Failed to load project');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProject();
    }
  }, [projectId, project]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onStateChange) {
      onStateChange({ mode: newMode, baseLayer });
    }
  };

  const handleLayerChange = (newLayer) => {
    setBaseLayer(newLayer);
    if (onStateChange) {
      onStateChange({ mode, baseLayer: newLayer });
    }
  };

  const handleZoomIn = () => {
    if (mode === '2d' && mapRef.current) {
      mapRef.current.zoomIn();
    } else if (mode === '3d') {
      // Try Cesium first, then Potree
      if (viewersRef.current.cesiumViewer) {
        const camera = viewersRef.current.cesiumViewer.camera;
        const distance = window.Cesium.Cartesian3.distance(camera.position, camera.positionWC);
        camera.moveForward(distance * 0.2);
      } else if (viewersRef.current.potreeViewer) {
        const viewer = viewersRef.current.potreeViewer;
        const currentSpeed = viewer.getMoveSpeed();
        viewer.setMoveSpeed(currentSpeed * 0.5);
        
        const camera = viewer.scene.getActiveCamera();
        const forward = new window.THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.multiplyScalar(currentSpeed * 5);
        camera.position.add(forward);
        
        setTimeout(() => viewer.setMoveSpeed(currentSpeed), 100);
      }
    }
  };

  const handleZoomOut = () => {
    if (mode === '2d' && mapRef.current) {
      mapRef.current.zoomOut();
    } else if (mode === '3d') {
      // Try Cesium first, then Potree
      if (viewersRef.current.cesiumViewer) {
        const camera = viewersRef.current.cesiumViewer.camera;
        const distance = window.Cesium.Cartesian3.distance(camera.position, camera.positionWC);
        camera.moveBackward(distance * 0.2);
      } else if (viewersRef.current.potreeViewer) {
        const viewer = viewersRef.current.potreeViewer;
        const currentSpeed = viewer.getMoveSpeed();
        viewer.setMoveSpeed(currentSpeed * 0.5);
        
        const camera = viewer.scene.getActiveCamera();
        const forward = new window.THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.multiplyScalar(currentSpeed * 5);
        camera.position.sub(forward);
        
        setTimeout(() => viewer.setMoveSpeed(currentSpeed), 100);
      }
    }
  };

  const handleResetView = () => {
    if (mode === '2d' && mapRef.current && project?.location) {
      mapRef.current.setView([project.location.lat, project.location.lon], 18);
    } else if (mode === '3d') {
      // Try Cesium first, then Potree
      if (viewersRef.current.cesiumViewer && viewersRef.current.tileset) {
        viewersRef.current.cesiumViewer.zoomTo(viewersRef.current.tileset);
      } else if (viewersRef.current.cesiumViewer && project?.location) {
        const altitude = project.location.z || 1000;
        viewersRef.current.cesiumViewer.camera.flyTo({
          destination: window.Cesium.Cartesian3.fromDegrees(
            project.location.lon,
            project.location.lat,
            altitude + 2000
          ),
          orientation: {
            heading: window.Cesium.Math.toRadians(0),
            pitch: window.Cesium.Math.toRadians(-45),
            roll: 0.0
          }
        });
      } else if (viewersRef.current.potreeViewer) {
        viewersRef.current.potreeViewer.fitToScreen();
      }
    }
  };

  const handleViewerReady = (viewers) => {
    viewersRef.current = { ...viewersRef.current, ...viewers };
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white', background: '#1a1c20' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>Loading project...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white', background: '#1a1c20' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Error Loading Project</h1>
          <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error}</p>
          <a href="/" style={{ color: '#ee2f27', textDecoration: 'underline' }}>Return to Dashboard</a>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white', background: '#1a1c20' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Project Not Found</h1>
          <p style={{ marginBottom: '1rem' }}>The project you're looking for doesn't exist.</p>
          <a href="/" style={{ color: '#ee2f27', textDecoration: 'underline' }}>Return to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with project info */}
      <ViewerHeader project={project} />
      
      <div className="hwc-dashboard">
        {/* Mode Toggle (2D/3D) */}
        <ModeToggle mode={mode} onModeChange={handleModeChange} />
      
      {/* Base Layer Toggle (Streets/Satellite) */}
      <LayerToggle baseLayer={baseLayer} onLayerChange={handleLayerChange} />
      
      {/* Zoom Controls */}
      <ViewerZoomControls 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Potree Tools Panel (only in 3D mode) */}
      {mode === '3d' && (
        <PotreePanel
          potreeViewer={viewersRef.current.potreeViewer}
          cesiumViewer={viewersRef.current.cesiumViewer}
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
        />
      )}

      {/* Viewer Content */}
      {mode === '3d' ? (
        <Viewer3D 
          project={project} 
          baseLayer={baseLayer}
          onViewerReady={handleViewerReady}
          mapTilerKey={mapTilerKey}
        />
      ) : (
        <Viewer2D 
          project={project} 
          baseLayer={baseLayer}
          mapTilerKey={mapTilerKey}
          onMapReady={(map) => { mapRef.current = map; }}
        />
      )}
      </div>
    </>
  );
}
