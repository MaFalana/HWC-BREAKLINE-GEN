import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * ImageOrthoLayer - Simple image overlay for 2D maps
 * 
 * Displays a JPG/PNG image as an overlay with specified bounds.
 * Much simpler and faster than GeoTIFF approach.
 * 
 * @param {Object} props
 * @param {string} props.url - URL to image file (JPG/PNG)
 * @param {Array} props.bounds - [[south, west], [north, east]] or null to auto-calculate
 * @param {number} props.opacity - Layer opacity (0-1)
 * @param {string} props.blendMode - CSS mix-blend-mode (e.g., 'multiply', 'screen', 'overlay')
 * @param {Object} props.pointCloudBounds - Optional point cloud bounds for auto-calculation
 * @param {Object} props.crs - Optional CRS with proj4 string for coordinate transformation
 * @param {Function} props.onLoad - Callback when image loads
 * @param {Function} props.onError - Callback on load error
 */
export function ImageOrthoLayer({ 
  url, 
  bounds, 
  opacity = 0.9,
  blendMode = null,
  pointCloudBounds,
  crs,
  onLoad, 
  onError 
}) {
  const map = useMap();

  useEffect(() => {
    if (!url || !map) return;

    let imageOverlay = null;

    const loadImage = async () => {
      try {
        // Use provided bounds or calculate from point cloud
        let imageBounds = bounds;

        if (!imageBounds && pointCloudBounds && crs?.proj4 && window.proj4) {
          // Auto-calculate bounds from point cloud using proj4
          imageBounds = calculateBoundsFromPointCloud(pointCloudBounds, crs.proj4);
        }

        if (!imageBounds) {
          throw new Error('No bounds provided and unable to calculate from point cloud');
        }

        // Create image overlay
        imageOverlay = L.imageOverlay(url, imageBounds, {
          opacity: opacity,
          interactive: false,
          crossOrigin: true
        });

        // Add to map
        imageOverlay.addTo(map);

        // Apply blend mode if specified
        if (blendMode) {
          const element = imageOverlay.getElement();
          if (element) {
            element.style.mixBlendMode = blendMode;
          }
        }

        // Fit map to bounds
        map.fitBounds(imageBounds, { padding: [50, 50] });

        // Handle image load
        imageOverlay.getElement()?.addEventListener('load', () => {
          if (onLoad) {
            onLoad({ bounds: imageBounds });
          }
        });

        // Handle image error
        imageOverlay.getElement()?.addEventListener('error', (err) => {
          console.error('Failed to load ortho image:', err);
          if (onError) {
            onError(new Error('Failed to load ortho image'));
          }
        });

      } catch (error) {
        console.error('Failed to create ortho overlay:', error);
        if (onError) {
          onError(error);
        }
      }
    };

    loadImage();

    // Cleanup
    return () => {
      if (imageOverlay && map) {
        map.removeLayer(imageOverlay);
      }
    };
  }, [url, bounds, opacity, pointCloudBounds, crs, map, onLoad, onError, blendMode]);

  // Update opacity when it changes
  useEffect(() => {
    const layers = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.ImageOverlay) {
        layers.push(layer);
      }
    });

    layers.forEach(layer => {
      layer.setOpacity(opacity);
    });
  }, [opacity, map]);

  return null;
}

/**
 * Calculate WGS84 bounds from point cloud bounds using proj4
 */
function calculateBoundsFromPointCloud(pointCloudBounds, proj4String) {
  if (!window.proj4) {
    throw new Error('proj4 is not loaded');
  }

  const { min, max } = pointCloudBounds;
  
  // Create transformation from point cloud CRS to WGS84
  const transform = window.proj4(proj4String, 'EPSG:4326');

  // Transform corners
  const sw = transform.forward([min.x, min.y]); // [lon, lat]
  const ne = transform.forward([max.x, max.y]); // [lon, lat]

  // Return in Leaflet format: [[south, west], [north, east]]
  return [
    [sw[1], sw[0]], // [lat, lon]
    [ne[1], ne[0]]  // [lat, lon]
  ];
}
