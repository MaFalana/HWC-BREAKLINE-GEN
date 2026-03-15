import { useEffect, useRef, useState } from 'react';
import { usePotreeLoader } from './hooks/usePotreeLoader.jsx';
import { useCesiumLoader } from './hooks/useCesiumLoader.jsx';
import { PotreeAttribution } from './attribution.jsx';
import './potree.css';

/**
 * HwcPotree - 3D Point Cloud Viewer
 * 
 * Renders point clouds using Potree 1.8.2 with Cesium base layer integration.
 * 
 * @param {Object} props
 * @param {string} props.pointCloudUrl - URL to point cloud metadata.json
 * @param {string} props.name - Display name for the point cloud
 * @param {Object} props.location - WGS84 location { lat, lon, z }
 * @param {Object} props.crs - Coordinate reference system with proj4 string
 * @param {string} props.baseLayer - "streets" or "satellite"
 * @param {string} props.mapTilerKey - MapTiler API key for satellite imagery
 * @param {Function} props.onViewerReady - Callback when viewers are initialized
 * @param {Object} props.orthoUrl - Optional ortho COG URL for overlay
 */
export function HwcPotree({
  pointCloudUrl,
  name = 'Point Cloud',
  location,
  crs,
  baseLayer = 'satellite',
  mapTilerKey,
  onViewerReady,
  orthoUrl
}) {
  const potreeContainerRef = useRef(null);
  const cesiumContainerRef = useRef(null);
  const viewersRef = useRef({ cesiumViewer: null, potreeViewer: null });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [error, setError] = useState(null);

  // Load Cesium library (from Potree bundle)
  const { isLoaded: isCesiumLoaded, error: cesiumError, Cesium } = useCesiumLoader();

  // Load Potree library
  const { isLoaded: isPotreeLoaded, error: potreeError, Potree } = usePotreeLoader();

  // Initialize both viewers together
  useEffect(() => {
    if (!isCesiumLoaded || !Cesium || !isPotreeLoaded || !Potree || !potreeContainerRef.current || !cesiumContainerRef.current) {
      return;
    }

    // Load proj4 if not already loaded (synchronous check)
    if (!window.proj4) {
      const script = document.createElement('script');
      script.src = '/potree/1.8.2/libs/proj4/proj4.js';
      script.async = false;
      document.head.appendChild(script);
    }

    const initViewers = async () => {
      try {
        setLoadingStatus('Initializing viewers...');

        // Create Cesium viewer first (background layer)
        const cesiumViewer = new Cesium.Viewer(cesiumContainerRef.current, {
          useDefaultRenderLoop: false,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          shouldAnimate: false,
          terrainShadows: Cesium.ShadowMode.DISABLED,
          creditContainer: document.createElement('div'),
        });

        // Configure Cesium scene
        cesiumViewer.scene.globe.show = true;
        cesiumViewer.scene.globe.depthTestAgainstTerrain = false;
        cesiumViewer.scene.globe.enableLighting = false;
        cesiumViewer.scene.fog.enabled = false;
        cesiumViewer.scene.sun.show = false;
        cesiumViewer.scene.moon.show = false;

        // Add base layer imagery
        cesiumViewer.imageryLayers.removeAll();
        updateBaseLayer(cesiumViewer, baseLayer, mapTilerKey, Cesium);

        // Position camera at location
        if (location) {
          cesiumViewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
              location.lon,
              location.lat,
              5000
            ),
            orientation: {
              heading: 0,
              pitch: -Cesium.Math.toRadians(45),
              roll: 0.0
            }
          });
        }

        cesiumViewer.resize();
        viewersRef.current.cesiumViewer = cesiumViewer;

        // Create Potree viewer (foreground layer)
        setLoadingStatus('Loading point cloud...');

        const potreeViewer = new Potree.Viewer(potreeContainerRef.current, {
          useDefaultRenderLoop: false
        });

        // Configure Potree
        potreeViewer.setEDLEnabled(true);
        potreeViewer.setLengthUnit('ft');
        potreeViewer.setFOV(60);
        potreeViewer.setPointBudget(2_000_000);
        potreeViewer.setDescription('');
        potreeViewer.setBackground(null);

        // Use Earth controls
        potreeViewer.setControls(potreeViewer.earthControls);
        potreeViewer.earthControls.enabled = true;

        if (potreeViewer.orbitControls) {
          potreeViewer.orbitControls.enabled = false;
        }

        // Force transparent renderer
        if (potreeViewer.renderer) {
          potreeViewer.renderer.setClearColor(0x000000, 0);
          potreeViewer.renderer.setClearAlpha(0);
          if (potreeViewer.renderer.domElement) {
            potreeViewer.renderer.domElement.style.background = 'transparent';
          }
        }

        if (potreeViewer.scene && potreeViewer.scene.scene) {
          potreeViewer.scene.scene.background = null;
        }

        viewersRef.current.potreeViewer = potreeViewer;

        // Load point cloud if URL provided
        if (pointCloudUrl) {
          Potree.loadPointCloud(pointCloudUrl, name, (e) => {
            if (e.type === 'loading_failed') {
              console.error('Failed to load point cloud:', e);
              setError('Failed to load point cloud.');
              setIsLoading(false);
              return;
            }

            const pointcloud = e.pointcloud;
            const material = pointcloud.material;

            // Configure material
            material.size = 0.30;
            material.pointSizeType = Potree.PointSizeType.FIXED;
            material.shape = Potree.PointShape.CIRCLE;
            material.opacity = 1.0;

            // Add to scene
            potreeViewer.scene.addPointCloud(pointcloud);

            // Setup proj4 transformation if CRS provided
            if (window.proj4 && crs?.proj4) {
              const statePlane = crs.proj4;
              const wgs84 = 'EPSG:4326';
              window.proj4Transform = window.proj4(statePlane, wgs84);
              window.heightOffset = location?.z || 0;
            }

            // Store reference points
            window.statePlaneReference = {
              x: pointcloud.position.x,
              y: pointcloud.position.y,
              z: pointcloud.position.z
            };
            window.wgs84Center = location;

            // Fit camera
            potreeViewer.fitToScreen();

            setIsLoading(false);
            setLoadingStatus('');

            // Start render loop
            startRenderLoop(potreeViewer, cesiumViewer);

            // Notify parent
            if (onViewerReady) {
              onViewerReady({
                cesiumViewer: cesiumViewer,
                potreeViewer: potreeViewer
              });
            }
          });
        } else {
          // No point cloud, just Cesium
          setIsLoading(false);
          setLoadingStatus('');

          const renderLoop = () => {
            if (viewersRef.current.cesiumViewer && !viewersRef.current.cesiumViewer.isDestroyed()) {
              viewersRef.current.cesiumViewer.render();
              requestAnimationFrame(renderLoop);
            }
          };
          renderLoop();

          if (onViewerReady) {
            onViewerReady({
              cesiumViewer: cesiumViewer,
              potreeViewer: null
            });
          }
        }

      } catch (err) {
        console.error('Failed to initialize viewers:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initViewers();

    // Cleanup
    return () => {
      if (window.renderLoopId) {
        cancelAnimationFrame(window.renderLoopId);
        window.renderLoopId = null;
      }

      if (viewersRef.current.potreeViewer) {
        try {
          const scene = viewersRef.current.potreeViewer.scene;
          if (scene && scene.pointclouds && scene.pointclouds.length > 0) {
            // Clear point clouds array (Potree 1.8.2 doesn't have removePointCloud method)
            scene.pointclouds.length = 0;
          }
          viewersRef.current.potreeViewer = null;
        } catch (err) {
          console.warn('Error cleaning up Potree:', err);
        }
      }

      if (viewersRef.current.cesiumViewer && !viewersRef.current.cesiumViewer.isDestroyed()) {
        viewersRef.current.cesiumViewer.destroy();
      }

      viewersRef.current = { cesiumViewer: null, potreeViewer: null };
    };
  }, [isPotreeLoaded, Potree, isCesiumLoaded, Cesium, pointCloudUrl, name, location, crs]);

  // Update base layer when it changes
  useEffect(() => {
    if (viewersRef.current.cesiumViewer && Cesium) {
      updateBaseLayer(viewersRef.current.cesiumViewer, baseLayer, mapTilerKey, Cesium);
    }
  }, [baseLayer, mapTilerKey, Cesium]);

  // Handle loading errors
  useEffect(() => {
    if (cesiumError) {
      setError(`Failed to load Cesium: ${cesiumError}`);
      setIsLoading(false);
    }
    if (potreeError) {
      setError(`Failed to load Potree: ${potreeError}`);
      setIsLoading(false);
    }
  }, [cesiumError, potreeError]);

  if (error) {
    return (
      <div className="hwc-potree-error">
        <p>Failed to initialize 3D viewer</p>
        <p className="error-detail">{error}</p>
      </div>
    );
  }

  return (
    <div className="hwc-potree-container">
      <PotreeAttribution baseLayer={baseLayer} />
      
      {isLoading && (
        <div className="hwc-potree-loading">
          <div className="spinner" />
          <p>{loadingStatus || 'Initializing 3D viewer...'}</p>
        </div>
      )}

      {/* Cesium container - background layer */}
      <div
        ref={cesiumContainerRef}
        className="hwc-potree-cesium"
        style={{ visibility: isLoading ? 'hidden' : 'visible' }}
      />

      {/* Potree container - foreground layer */}
      <div
        ref={potreeContainerRef}
        className="hwc-potree-canvas"
        style={{ visibility: isLoading ? 'hidden' : 'visible' }}
      />
    </div>
  );
}

// Synchronized render loop
function startRenderLoop(potreeViewer, cesiumViewer) {
  if (window.renderLoopId) {
    cancelAnimationFrame(window.renderLoopId);
  }

  const loop = (timestamp) => {
    if (!potreeViewer || !cesiumViewer || cesiumViewer.isDestroyed()) {
      window.renderLoopId = null;
      return;
    }

    potreeViewer.update(potreeViewer.clock.getDelta(), timestamp);
    potreeViewer.render();

    try {
      if (window.proj4Transform) {
        syncCameraWithProj4(potreeViewer, cesiumViewer);
      }
    } catch (err) {
      if (!window.cameraSyncErrorLogged) {
        console.error('Camera sync error:', err);
        window.cameraSyncErrorLogged = true;
      }
    }

    try {
      cesiumViewer.render();
    } catch (err) {
      console.warn('Cesium render error:', err.message);
    }

    window.renderLoopId = requestAnimationFrame(loop);
  };

  window.renderLoopId = requestAnimationFrame(loop);
}

// Sync camera using proj4 transformation
function syncCameraWithProj4(potreeViewer, cesiumViewer) {
  try {
    const camera = potreeViewer.scene.getActiveCamera();
    const pPos = new window.THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorld);
    const pTarget = potreeViewer.scene.view.getPivot();

    const maxDistance = 10000000;
    if (Math.abs(pPos.x) > maxDistance || Math.abs(pPos.y) > maxDistance ||
        Math.abs(pTarget.x) > maxDistance || Math.abs(pTarget.y) > maxDistance) {
      return;
    }

    const [camLon, camLat] = window.proj4Transform.forward([pPos.x, pPos.y]);
    const [targetLon, targetLat] = window.proj4Transform.forward([pTarget.x, pTarget.y]);

    if (!isFinite(camLon) || !isFinite(camLat) ||
        Math.abs(camLon) > 180 || Math.abs(camLat) > 90) {
      return;
    }

    const feetToMeters = 0.3048;
    const groundElevation = window.heightOffset || 0;
    const camHeight = (pPos.z - groundElevation) * feetToMeters;
    const targetHeight = (pTarget.z - groundElevation) * feetToMeters;

    if (!isFinite(camHeight) || camHeight < -1000 || camHeight > 100000) {
      return;
    }

    const cPos = window.Cesium.Cartesian3.fromDegrees(camLon, camLat, camHeight);
    const cTarget = window.Cesium.Cartesian3.fromDegrees(targetLon, targetLat, targetHeight);

    const cDir = window.Cesium.Cartesian3.subtract(cTarget, cPos, new window.Cesium.Cartesian3());
    window.Cesium.Cartesian3.normalize(cDir, cDir);

    const cUp = window.Cesium.Cartesian3.normalize(
      window.Cesium.Cartesian3.clone(cPos),
      new window.Cesium.Cartesian3()
    );

    cesiumViewer.camera.setView({
      destination: cPos,
      orientation: {
        direction: cDir,
        up: cUp
      }
    });

    const aspect = camera.aspect;
    const fovy = Math.PI * (camera.fov / 180);
    if (aspect < 1) {
      cesiumViewer.camera.frustum.fov = fovy;
    } else {
      const fovx = Math.atan(Math.tan(0.5 * fovy) * aspect) * 2;
      cesiumViewer.camera.frustum.fov = fovx;
    }
  } catch (err) {
    console.error('Camera sync error:', err);
  }
}

// Update base layer
function updateBaseLayer(viewer, baseLayer, mapTilerKey, Cesium) {
  if (!viewer || !Cesium) return;

  viewer.imageryLayers.removeAll();

  if (baseLayer === 'satellite') {
    // ESRI World Imagery (free, no key needed)
    const esriProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: '© Esri, Maxar, Earthstar Geographics',
      maximumLevel: 19
    });
    viewer.imageryLayers.addImageryProvider(esriProvider);
  } else {
    // OpenStreetMap (free, default)
    const osmProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '© OpenStreetMap contributors'
    });
    viewer.imageryLayers.addImageryProvider(osmProvider);
  }
}
