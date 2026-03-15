import '../../styles/map.css';
import { FaPlus, FaMinus, FaCube, FaMap } from 'react-icons/fa6';
import { MdCenterFocusStrong } from 'react-icons/md';

export function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="layer-toggles" style={{ bottom: '10rem' }}>
      <button 
        onClick={() => onModeChange('2d')} 
        className="layer-btn" 
        aria-label="2D view"
        aria-checked={mode === '2d'}
        title="2D Map View"
      >
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'var(--hdr-fg)'
        }}>
          2D
        </div>
        <span className="active-dot" />
      </button>

      <button 
        onClick={() => onModeChange('3d')} 
        className="layer-btn" 
        aria-label="3D view"
        aria-checked={mode === '3d'}
        title="3D Point Cloud View"
      >
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'var(--hdr-fg)'
        }}>
          3D
        </div>
        <span className="active-dot" />
      </button>
    </div>
  );
}

export function LayerToggle({ baseLayer, onLayerChange }) {
  return (
    <div className="layer-toggles">
      <button 
        onClick={() => onLayerChange('streets')} 
        className="layer-btn" 
        aria-label="Street view"
        aria-checked={baseLayer === 'streets'}
        title="Street Map"
      >
        <img src="/assets/streets.png" alt="Street view" />
        <span className="active-dot" />
      </button>

      <button 
        onClick={() => onLayerChange('satellite')} 
        className="layer-btn" 
        aria-label="Satellite view"
        aria-checked={baseLayer === 'satellite'}
        title="Satellite Imagery"
      >
        <img src="/assets/satellite.png" alt="Satellite view" />
        <span className="active-dot" />
      </button>
    </div>
  );
}

export function ViewerZoomControls({ onZoomIn, onZoomOut, onResetView }) {
  return (
    <div className="zoom-controls">
      <button 
        onClick={onZoomOut} 
        className="zoom-btn" 
        aria-label="Zoom out"
        title="Zoom Out"
      >
        <FaMinus />
      </button>

      <button 
        onClick={onResetView} 
        className="zoom-btn" 
        aria-label="Reset view"
        title="Reset Camera"
      >
        <MdCenterFocusStrong />
      </button>

      <button 
        onClick={onZoomIn} 
        className="zoom-btn" 
        aria-label="Zoom in"
        title="Zoom In"
      >
        <FaPlus />
      </button>
    </div>
  );
}
