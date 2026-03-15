import { useEffect, useState } from 'react';

/**
 * Loads Cesium library from Potree's bundled version (1.39)
 * This ensures compatibility with Potree 1.8.2
 * 
 * Cesium libs should be in: packages/potree/public/1.8.2/libs/Cesium/
 * They will be served from: /potree/1.8.2/libs/Cesium/ (via Vite public dir)
 */
export function useCesiumLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
        // Base path for Cesium libs
        const basePath = '/potree/1.8.2/libs/Cesium';
        
        loadCSS(`${basePath}/Widgets/CesiumWidget/CesiumWidget.css`);
        await loadScript(`${basePath}/Cesium.js`);
        await new Promise(resolve => setTimeout(resolve, 100));

        if (window.Cesium) {
          window.Cesium.buildModuleUrl.setBaseUrl(`${basePath}/`);
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
