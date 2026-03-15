import { useEffect, useState } from 'react';

/**
 * Loads Cesium library from Potree's bundled version
 * This ensures compatibility with Potree 1.8.2
 */
export function useCesiumLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    // Check if Cesium is already loaded
    if (window.Cesium) {
      setIsLoaded(true);
      return;
    }

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const loadCSS = (href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    const loadCesium = async () => {
      try {
        // Load Cesium CSS
        loadCSS('/potree/1.8.2/libs/Cesium/Widgets/CesiumWidget/CesiumWidget.css');

        // Load Cesium library (bundled with Potree)
        await loadScript('/potree/1.8.2/libs/Cesium/Cesium.js');

        // Wait a bit for Cesium to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        if (window.Cesium) {
          // Configure Cesium base paths
          window.Cesium.buildModuleUrl.setBaseUrl('/potree/1.8.2/libs/Cesium/');
          
          setIsLoaded(true);
        } else {
          throw new Error('Cesium object not found after loading script');
        }
      } catch (err) {
        console.error('Failed to load Cesium:', err);
        setError(err.message);
      }
    };

    loadCesium();
  }, []);

  return { 
    isLoaded, 
    error, 
    Cesium: typeof window !== 'undefined' ? window.Cesium : null 
  };
}
