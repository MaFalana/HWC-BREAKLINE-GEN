import { useEffect, useRef, useState } from 'react';
import '../../styles/viewer.css';
import { usePotreeLoader } from './PotreeLoader';
import { useCesiumLoader } from './CesiumLoader';
import { MapAttribution } from '../Dashboard/Map/Attribution';

export function Viewer3D({ project, baseLayer, onViewerReady }) {
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
      script.async = false; // Load synchronously
      document.head.appendChild(script);
    }

    const initViewers = async () => {
      try {
        setLoadingStatus('Initializing viewers...');

        // Create Cesium viewer first (background layer)
        const cesiumViewer = new Cesium.Viewer(cesiumContainerRef.current, {
          useDefaultRenderLoop: false, // Potree will control the render loop
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
          creditContainer: document.createElement('div'), // Hide default credits (we use custom attribution)
        });
        
        // Configure Cesium scene
        cesiumViewer.scene.globe.show = true;
        cesiumViewer.scene.globe.depthTestAgainstTerrain = false;
        cesiumViewer.scene.globe.enableLighting = false;
        cesiumViewer.scene.fog.enabled = false;
        cesiumViewer.scene.sun.show = false;
        cesiumViewer.scene.moon.show = false;
        
        // Note: Terrain provider not available in Cesium 1.39 without CORS issues
        // Using ellipsoid (sea level = 0m) as reference
        // Point cloud heights are adjusted relative to ground elevation in camera sync
        
        // Add MapTiler imagery (consistent with 2D viewer)
        cesiumViewer.imageryLayers.removeAll();
        
        // Set initial base layer based on baseLayer prop
        const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_API_KEY;
        if (baseLayer === 'satellite') {
          const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${mapTilerKey}`,
            credit: '© MapTiler © OpenStreetMap contributors'
          });
          cesiumViewer.imageryLayers.addImageryProvider(satelliteProvider);
        } else {
          const osmProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            credit: '© OpenStreetMap contributors'
          });
          cesiumViewer.imageryLayers.addImageryProvider(osmProvider);
        }

        // Position Cesium camera at project location
        // Position Cesium camera using Cartesian3 coordinates (ECEF)
        // These coordinates should match the point cloud location on Earth
        // Position camera at project location using WGS84 coordinates
        
        // Position camera at project location at reasonable altitude
        cesiumViewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            project.location.lon,
            project.location.lat,
            5000 // 5km above ground
          ),
          orientation: {
            heading: 0,
            pitch: -Cesium.Math.toRadians(45),
            roll: 0.0
          }
        });

        // Force Cesium to resize to container
        cesiumViewer.resize();
        viewersRef.current.cesiumViewer = cesiumViewer;

        // Create Potree viewer (foreground layer)
        setLoadingStatus('Loading point cloud...');
        
        const potreeViewer = new Potree.Viewer(potreeContainerRef.current, {
          useDefaultRenderLoop: false // We'll create custom render loop
        });

        // Configure Potree
        potreeViewer.setEDLEnabled(true);
        potreeViewer.setLengthUnit('ft');
        potreeViewer.setFOV(60);
        potreeViewer.setPointBudget(2_000_000);
        potreeViewer.setDescription('');
        potreeViewer.setBackground(null); // Transparent to show Cesium behind
        
        // Use Earth controls instead of orbit controls (better for geospatial data)
        potreeViewer.setControls(potreeViewer.earthControls);
        potreeViewer.earthControls.enabled = true;
        
        // Disable orbit controls
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
        
        // Also set scene background to null
        if (potreeViewer.scene && potreeViewer.scene.scene) {
          potreeViewer.scene.scene.background = null;
        }
        
        viewersRef.current.potreeViewer = potreeViewer;

        // Load point cloud if available
        if (project?.cloud) {
          Potree.loadPointCloud(`https://hwctopodot.blob.core.windows.net/hwc-potree/${project._id}/metadata.json`, project.name || project._id, (e) => {
            if (e.type === 'loading_failed') {
              console.error('Failed to load point cloud:', e);
              setError('Failed to load point cloud.');
              setIsLoading(false);
              return;
            }
            
            const pointcloud = e.pointcloud;
            const material = pointcloud.material;
            
            // Configure material with default properties
            material.size = 0.30;
            material.pointSizeType = Potree.PointSizeType.FIXED;
            material.shape = Potree.PointShape.CIRCLE;
            material.opacity = 1.0;
            
            // Add to scene (keep original State Plane position)
            potreeViewer.scene.addPointCloud(pointcloud);
            
            // Get the State Plane position (this is where the point cloud is in State Plane coordinates)
            const statePlanePosition = {
              x: pointcloud.position.x,
              y: pointcloud.position.y,
              z: pointcloud.position.z
            };
            
            // Get point cloud bounding box center (in State Plane coordinates)
            const pointcloudCenter = pointcloud.boundingBox.getCenter(new window.THREE.Vector3());
            
            // Your project.location is the WGS84 equivalent of the State Plane center
            const wgs84Center = {
              lon: project.location.lon,
              lat: project.location.lat,
              height: project.location.z || 0 // Height in feet
            };
            
            // Setup proj4 transformation using project's proj4 string
            // COORDINATE SYSTEM NOTES:
            // - Point cloud: State Plane coordinates in US Survey Feet (from metadata)
            // - Cesium globe: WGS84 (EPSG:4326) in degrees, heights in meters above ellipsoid
            // - Transformation: proj4 converts State Plane XY to WGS84 lat/lon
            // - Height adjustment: Subtract ground elevation so point cloud sits on ellipsoid
            const proj4String = project.crs?.proj4 || project.proj4;
            
            if (window.proj4 && proj4String) {
              const statePlane = proj4String;
              const wgs84 = 'EPSG:4326';
              
              console.log('Setting up proj4 transformation with:', statePlane);
              
              // Create transformation from State Plane to WGS84
              window.proj4Transform = window.proj4(statePlane, wgs84);
              
              // Calculate height offset - the point cloud Z might be relative to ground
              // If project.location.z is ground elevation, we need to subtract it
              window.heightOffset = wgs84Center.height; // Store ground elevation
              
              console.log('proj4 transformation ready');
            } else {
              console.warn('proj4 not available or no proj4 string in project. CRS:', project.crs);
            }
            
            // Store State Plane reference point and WGS84 equivalent
            window.statePlaneReference = statePlanePosition;
            window.wgs84Center = wgs84Center;
            
            // Fit camera to point cloud
            potreeViewer.fitToScreen();
            
            setIsLoading(false);
            setLoadingStatus('');
            
            // Start synchronized render loop
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
          // No point cloud, just use Cesium
          setIsLoading(false);
          setLoadingStatus('');
          
          // Simple render loop for Cesium only
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
      // Stop render loop
      if (window.renderLoopId) {
        cancelAnimationFrame(window.renderLoopId);
        window.renderLoopId = null;
      }
      
      // Clean up Potree viewer
      if (viewersRef.current.potreeViewer) {
        try {
          // Remove point clouds from scene
          const scene = viewersRef.current.potreeViewer.scene;
          if (scene && scene.pointclouds) {
            scene.pointclouds.forEach(pc => scene.removePointCloud(pc));
          }
          // Potree doesn't have a destroy method, just clear reference
          viewersRef.current.potreeViewer = null;
        } catch (err) {
          console.warn('Error cleaning up Potree:', err);
        }
      }
      
      // Clean up Cesium viewer
      if (viewersRef.current.cesiumViewer && !viewersRef.current.cesiumViewer.isDestroyed()) {
        viewersRef.current.cesiumViewer.destroy();
      }
      
      viewersRef.current = { cesiumViewer: null, potreeViewer: null };
    };
  }, [isPotreeLoaded, Potree, isCesiumLoaded, Cesium, project]);

  // Update base layer when it changes
  useEffect(() => {
    if (viewersRef.current.cesiumViewer) {
      const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_API_KEY
      updateBaseLayer(viewersRef.current.cesiumViewer, baseLayer, mapTilerKey);
    }
  }, [baseLayer]);

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
      <div className="error-message">
        <p>Failed to initialize 3D viewer</p>
        <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapAttribution />
      
      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>{loadingStatus || 'Initializing 3D viewer...'}</p>
        </div>
      )}
      
      {/* Cesium container - background layer */}
      <div 
        ref={cesiumContainerRef}
        id="cesium_container"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%', 
          height: '100%',
          zIndex: 0,
          visibility: isLoading ? 'hidden' : 'visible',
          overflow: 'hidden'
        }}
      />
      
      {/* Potree container - foreground layer */}
      <div 
        ref={potreeContainerRef}
        id="potree_render_area"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%', 
          height: '100%',
          zIndex: 1,
          visibility: isLoading ? 'hidden' : 'visible',
          pointerEvents: 'auto',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}

// Synchronized render loop - Potree camera controls Cesium camera
function startRenderLoop(potreeViewer, cesiumViewer) {
  // Cancel any existing render loop
  if (window.renderLoopId) {
    cancelAnimationFrame(window.renderLoopId);
  }
  
  const loop = (timestamp) => {
    if (!potreeViewer || !cesiumViewer || cesiumViewer.isDestroyed()) {
      window.renderLoopId = null;
      return;
    }

    // Update and render Potree
    potreeViewer.update(potreeViewer.clock.getDelta(), timestamp);
    potreeViewer.render();

    // Sync Cesium camera with Potree camera (with error handling)
    try {
      if (window.proj4Transform) {
        syncCameraWithProj4(potreeViewer, cesiumViewer);
      } else {
        // If no proj4 transform, log once
        if (!window.proj4LoggedOnce) {
          console.warn('proj4Transform not available - camera sync disabled');
          window.proj4LoggedOnce = true;
        }
      }
    } catch (err) {
      // Log camera sync errors but don't stop rendering
      if (!window.cameraSyncErrorLogged) {
        console.error('Camera sync error:', err);
        window.cameraSyncErrorLogged = true;
      }
    }

    // Render Cesium
    try {
      cesiumViewer.render();
    } catch (err) {
      // Catch Cesium render errors
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
    
    // Get camera position in world space (State Plane coordinates in feet)
    const pPos = new window.THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorld);
    const pTarget = potreeViewer.scene.view.getPivot();
    
    // Debug log once
    if (!window.cameraSyncDebugLogged) {
      console.log('Camera sync - State Plane position:', { x: pPos.x, y: pPos.y, z: pPos.z });
      console.log('Camera sync - Target:', { x: pTarget.x, y: pTarget.y, z: pTarget.z });
      window.cameraSyncDebugLogged = true;
    }
    
    // Basic validation - check if positions are reasonable
    const maxDistance = 10000000; // 10 million feet (~3000 km)
    if (Math.abs(pPos.x) > maxDistance || Math.abs(pPos.y) > maxDistance ||
        Math.abs(pTarget.x) > maxDistance || Math.abs(pTarget.y) > maxDistance) {
      if (!window.cameraDistanceWarningLogged) {
        console.warn('Camera too far from origin, skipping sync');
        window.cameraDistanceWarningLogged = true;
      }
      return; // Camera is too far from origin
    }
    
    // Transform State Plane (feet) to WGS84 (degrees)
    const [camLon, camLat] = window.proj4Transform.forward([pPos.x, pPos.y]);
    const [targetLon, targetLat] = window.proj4Transform.forward([pTarget.x, pTarget.y]);
    
    // Debug log transformed coordinates once
    if (!window.transformDebugLogged) {
      console.log('Transformed WGS84 camera:', { lon: camLon, lat: camLat });
      console.log('Transformed WGS84 target:', { lon: targetLon, lat: targetLat });
      window.transformDebugLogged = true;
    }
    
    // Validate transformed coordinates are within valid WGS84 bounds
    if (!isFinite(camLon) || !isFinite(camLat) || 
        Math.abs(camLon) > 180 || Math.abs(camLat) > 90) {
      if (!window.invalidCoordsWarningLogged) {
        console.warn('Invalid WGS84 coordinates after transformation:', { camLon, camLat });
        window.invalidCoordsWarningLogged = true;
      }
      return; // Invalid coordinates
    }
    
    // Convert height from feet to meters
    // The point cloud Z appears to be offset - subtract ground elevation to get height above ellipsoid
    const feetToMeters = 0.3048;
    const groundElevation = window.heightOffset || 0; // Ground elevation in feet
    
    // Adjust Z to be relative to ellipsoid (sea level)
    const camHeight = (pPos.z - groundElevation) * feetToMeters;
    const targetHeight = (pTarget.z - groundElevation) * feetToMeters;
    
    // Validate heights are reasonable
    if (!isFinite(camHeight) || camHeight < -1000 || camHeight > 100000) {
      return; // Height out of reasonable range (-1km to 100km)
    }
    
    // Create Cesium positions
    const cPos = window.Cesium.Cartesian3.fromDegrees(camLon, camLat, camHeight);
    const cTarget = window.Cesium.Cartesian3.fromDegrees(targetLon, targetLat, targetHeight);
    
    // Calculate direction and up vectors
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
    
    // Sync FOV
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



// Helper function to update base layer (Cesium 1.39 compatible - MapTiler)
function updateBaseLayer(viewer, baseLayer, mapTilerKey) {
  if (!viewer || !window.Cesium) return;
  
  viewer.imageryLayers.removeAll();
  
  if (baseLayer === 'satellite') {
    // MapTiler satellite imagery
    const satelliteProvider = new window.Cesium.UrlTemplateImageryProvider({
      url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${mapTilerKey}`,
      credit: '© MapTiler © OpenStreetMap contributors'
    });
    viewer.imageryLayers.addImageryProvider(satelliteProvider);
  } else {
    // OpenStreetMap street map
    const osmProvider = new window.Cesium.UrlTemplateImageryProvider({
      url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '© OpenStreetMap contributors'
    });
    viewer.imageryLayers.addImageryProvider(osmProvider);
  }
}
