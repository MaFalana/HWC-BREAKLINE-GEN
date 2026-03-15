import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/map.css';
import { MapAttribution } from '../Dashboard/Map/Attribution';

// Component to fit map to bounds
function FitBounds({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

// Component to expose map instance for zoom controls
function MapController({ onMapReady }) {
  const map = useMap();
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  return null;
}

export function Viewer2D({ project, baseLayer, onMapReady }) {
  const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_API_KEY;
  const [isLoading, setIsLoading] = useState(true);
  const [bounds, setBounds] = useState(null);
  const [map, setMap] = useState(null);
  const [orthoLayer, setOrthoLayer] = useState(null);
  const [loadingOrtho, setLoadingOrtho] = useState(false);
  
  const handleMapReady = (mapInstance) => {
    setMap(mapInstance);
    if (onMapReady) {
      onMapReady(mapInstance);
    }
  };

  useEffect(() => {
    // Calculate bounds from project location
    // For now, create a small area around the center point
    if (project?.location?.lat && project?.location?.lon) {
      // Create a ~500m box around the center (approximate)
      const offset = 0.005; // roughly 500m at mid-latitudes
      const bounds = [
        [project.location.lat - offset, project.location.lon - offset],
        [project.location.lat + offset, project.location.lon + offset]
      ];
      setBounds(bounds);
    }
    
    setIsLoading(false);
  }, [project]);

  // Load ortho COG if available
  useEffect(() => {
    if (!map || !project?.ortho) return;
    
    const loadOrtho = async () => {
      setLoadingOrtho(true);
      
      try {
        // Fetch the COG file
        const response = await fetch(project.ortho.file);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse the georaster
        const georaster = await parseGeoraster(arrayBuffer);
        
        // Check if georeferencing is valid
        if (!georaster.bounds || georaster.bounds.length === 0) {
          throw new Error('GeoTIFF is missing georeferencing information. Ensure the file has embedded coordinates or a world file.');
        }
        
        // Create the layer with proj4 support
        const layer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 0.9,
          resolution: 256,
          proj4: window.proj4, // Use proj4 from Potree
          pixelValuesToColorFn: values => {
            // Handle RGB values
            if (values.length >= 3) {
              return `rgb(${values[0]},${values[1]},${values[2]})`;
            }
            return null;
          }
        });
        
        // Add to map
        layer.addTo(map);
        setOrthoLayer(layer);
        
        // Fit map to ortho bounds
        const [[ymin, xmin], [ymax, xmax]] = georaster.bounds;
        map.fitBounds([[ymin, xmin], [ymax, xmax]], { padding: [50, 50] });
      } catch (error) {
        console.error('Failed to load ortho:', error);
      } finally {
        setLoadingOrtho(false);
      }
    };
    
    loadOrtho();
    
    // Cleanup
    return () => {
      if (orthoLayer && map) {
        map.removeLayer(orthoLayer);
      }
    };
  }, [map, project?.ortho]);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <p>Loading 2D view...</p>
      </div>
    );
  }

  if (!project?.location?.lat || !project?.location?.lon) {
    return (
      <div className="error-message">
        <p>No location data available for 2D view</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapAttribution />
      
      {loadingOrtho && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'var(--hdr-bg)',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          color: 'var(--hdr-fg)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div className="spinner-small" />
          Loading ortho...
        </div>
      )}
      
      <MapContainer
        center={[project.location.lat, project.location.lon]}
        zoom={18}
        minZoom={2}
        maxZoom={22}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Base layer - streets or satellite */}
        {baseLayer === 'streets' ? (
          <TileLayer
            key="streets"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="satellite"
            url={`https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${mapTilerKey}`}
            attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
            maxZoom={20}
          />
        )}

        {/* Point cloud footprint - show approximate area */}
        {bounds && (
          <Rectangle
            bounds={bounds}
            pathOptions={{
              color: 'var(--hwc-red)',
              weight: 2,
              fillColor: 'var(--hwc-red)',
              fillOpacity: 0.1
            }}
          />
        )}

        {/* Fit to bounds on load */}
        <FitBounds bounds={bounds} />
        
        {/* Expose map instance */}
        <MapController onMapReady={handleMapReady} />
      </MapContainer>
    </div>
  );
}
