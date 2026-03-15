import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';

/**
 * OrthoLayer - Adds ortho imagery (COG/GeoTIFF) overlay to map
 * 
 * @param {Object} props
 * @param {string} props.url - URL to ortho COG/GeoTIFF file
 * @param {number} props.opacity - Layer opacity (0-1)
 * @param {Function} props.onLoad - Callback when ortho loads
 * @param {Function} props.onError - Callback on load error
 */
export function OrthoLayer({ url, opacity = 0.9, onLoad, onError }) {
  const map = useMap();
  const [layer, setLayer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url || !map) return;

    const loadOrtho = async () => {
      setLoading(true);

      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);
        
        if (!georaster.bounds || georaster.bounds.length === 0) {
          throw new Error('GeoTIFF is missing georeferencing information');
        }
        
        const geoLayer = new GeoRasterLayer({
          georaster: georaster,
          opacity: opacity,
          resolution: 256,
          proj4: window.proj4,
          pixelValuesToColorFn: values => {
            if (values.length >= 3) {
              return `rgb(${values[0]},${values[1]},${values[2]})`;
            }
            return null;
          }
        });
        
        geoLayer.addTo(map);
        setLayer(geoLayer);
        
        // Fit map to ortho bounds
        const [[ymin, xmin], [ymax, xmax]] = georaster.bounds;
        map.fitBounds([[ymin, xmin], [ymax, xmax]], { padding: [50, 50] });
        
        if (onLoad) {
          onLoad(georaster);
        }
      } catch (error) {
        console.error('Failed to load ortho:', error);
        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadOrtho();
    
    return () => {
      if (layer && map) {
        map.removeLayer(layer);
      }
    };
  }, [url, map]);

  // Update opacity when it changes
  useEffect(() => {
    if (layer) {
      layer.setOpacity(opacity);
    }
  }, [layer, opacity]);

  return null;
}
