import { useState, useEffect } from 'react';

export function CameraSection({ potreeViewer }) {
  const [fov, setFov] = useState(60);

  useEffect(() => {
    if (potreeViewer) {
      setFov(potreeViewer.getFOV());
    }
  }, [potreeViewer]);

  const updateFOV = (value) => {
    setFov(value);
    if (potreeViewer) {
      potreeViewer.setFOV(value);
    }
  };

  const resetView = () => {
    if (potreeViewer) {
      potreeViewer.fitToScreen();
    }
  };

  return (
    <div className="camera-section">
      {/* FOV Control */}
      <div className="control-group">
        <label htmlFor="fov">
          Field of View
          <span className="control-value">{fov}°</span>
        </label>
        <input
          id="fov"
          type="range"
          min="20"
          max="100"
          step="1"
          value={fov}
          onChange={(e) => updateFOV(parseInt(e.target.value))}
          className="slider"
        />
      </div>

      {/* Reset View Button */}
      <button className="control-btn" onClick={resetView}>
        Reset View
      </button>
    </div>
  );
}
