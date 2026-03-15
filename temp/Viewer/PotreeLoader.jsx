import { useEffect, useState } from 'react';

/**
 * Loads Potree library scripts dynamically
 * Returns loading state and Potree global object
 */
export function usePotreeLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    // Check if Potree is already loaded
    if (window.Potree) {
      setIsLoaded(true);
      return;
    }

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Load in order
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
        // Load Potree CSS
        loadCSS('/potree/1.8.2/build/potree/potree.css');

        // Load required libraries in order
        await loadScript('/potree/1.8.2/libs/jquery/jquery-3.1.1.min.js');
        await loadScript('/potree/1.8.2/libs/spectrum/spectrum.js');
        await loadScript('/potree/1.8.2/libs/jquery-ui/jquery-ui.min.js');
        await loadScript('/potree/1.8.2/libs/other/BinaryHeap.js');
        await loadScript('/potree/1.8.2/libs/tween/tween.min.js');
        await loadScript('/potree/1.8.2/libs/d3/d3.js');
        await loadScript('/potree/1.8.2/libs/proj4/proj4.js');
        await loadScript('/potree/1.8.2/libs/openlayers3/ol.js');
        await loadScript('/potree/1.8.2/libs/i18next/i18next.js');
        await loadScript('/potree/1.8.2/libs/jstree/jstree.js');
        
        // Load Three.js
        await loadScript('/potree/1.8.2/libs/three.js/build/three.min.js');
        
        // Load Potree main library
        await loadScript('/potree/1.8.2/build/potree/potree.js');

        // Wait a bit for Potree to initialize
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
