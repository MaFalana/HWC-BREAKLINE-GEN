import './map.css';
import { FaPlus, FaMinus } from "react-icons/fa6";
import { MdCenterFocusStrong } from "react-icons/md";
import React from 'react';

export function LayerToggle({ baseLayer, setBaseLayer }) {
  return (
    <div className='layer-toggles'>
      <button 
        onClick={() => setBaseLayer('streets')} 
        className="layer-btn" 
        aria-label="Street view"
        aria-checked={baseLayer === 'streets'}
      >
        <img src="/assets/streets.png" alt="Street view" />
        <span className="active-dot" />
      </button>

      <button 
        onClick={() => setBaseLayer('satellite')} 
        className="layer-btn" 
        aria-label="Satellite view"
        aria-checked={baseLayer === 'satellite'}
      >
        <img src="/assets/satellite.png" alt="Satellite view" />
        <span className="active-dot" />
      </button>
    </div>
  );
}

export function ZoomControls({ onZoomIn, onZoomOut, onZoomToAll }) {
  return (
    <div className="zoom-controls">
      <button 
        onClick={onZoomOut} 
        className="zoom-btn" 
        aria-label="Zoom out"
      >
        <FaMinus />
      </button>

      <button 
        onClick={onZoomToAll} 
        className="zoom-btn" 
        aria-label="Zoom to all markers"
      >
        <MdCenterFocusStrong />
      </button>

      <button 
        onClick={onZoomIn} 
        className="zoom-btn" 
        aria-label="Zoom in"
      >
        <FaPlus />
      </button>
    </div>
  );
}
