import { useEffect, useState } from 'react';

/**
 * Loads Potree 1.8.2 library scripts dynamically
 * Returns loading state and Potree global object
 * 
 * Potree libs should be in: packages/potree/public/1.8.2/
 * They will be served from: /potree/1.8.2/ (via Vite public dir)
 */
export function usePotreeLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.Potree) {
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

    const loadPotree = async () => {
      try {
        // Base path for Potree libs
        const basePath = '/potree/1.8.2';
        
        loadCSS(`${basePath}/build/potree/potree.css`);

        await loadScript(`${basePath}/libs/jquery/jquery-3.1.1.min.js`);
        await loadScript(`${basePath}/libs/spectrum/spectrum.js`);
        await loadScript(`${basePath}/libs/jquery-ui/jquery-ui.min.js`);
        await loadScript(`${basePath}/libs/other/BinaryHeap.js`);
        await loadScript(`${basePath}/libs/tween/tween.min.js`);
        await loadScript(`${basePath}/libs/d3/d3.js`);
        await loadScript(`${basePath}/libs/proj4/proj4.js`);
        await loadScript(`${basePath}/libs/openlayers3/ol.js`);
        await loadScript(`${basePath}/libs/i18next/i18next.js`);
        await loadScript(`${basePath}/libs/jstree/jstree.js`);
        await loadScript(`${basePath}/libs/three.js/build/three.min.js`);
        await loadScript(`${basePath}/build/potree/potree.js`);

        await new Promise(resolve => setTimeout(resolve, 100));

        if (window.Potree) {
          setIsLoaded(true);
        } else {
          throw new Error('Potree object not found after loading scripts');
        }
      } catch (err) {
        console.error('Failed to load Potree:', err);
        setError(err.message);
      }
    };

    loadPotree();
  }, []);

  return {
    isLoaded,
    error,
    Potree: typeof window !== 'undefined' ? window.Potree : null
  };
}
