import { useState, useEffect } from 'react';

export function AppearanceSection({ potreeViewer }) {
  const [pointSize, setPointSize] = useState(0.30);
  const [pointSizing, setPointSizing] = useState('FIXED');
  const [shape, setShape] = useState('CIRCLE');
  const [opacity, setOpacity] = useState(1.0);
  const [displayMode, setDisplayMode] = useState('RGB');
  const [edlEnabled, setEdlEnabled] = useState(true);
  const [pointBudget, setPointBudget] = useState(2000000);

  // Initialize from viewer
  useEffect(() => {
    if (!potreeViewer || !window.Potree) return;

    const pointclouds = potreeViewer.scene.pointclouds;
    if (pointclouds.length > 0) {
      const material = pointclouds[0].material;
      
      setPointSize(material.size || 0.30);
      setPointSizing(material.pointSizeType === window.Potree.PointSizeType.FIXED ? 'FIXED' : 'ADAPTIVE');
      setShape(material.shape === window.Potree.PointShape.CIRCLE ? 'CIRCLE' : 'SQUARE');
      setOpacity(material.opacity || 1.0);
    }

    setEdlEnabled(potreeViewer.getEDLEnabled());
  }, [potreeViewer]);

  const updatePointSize = (value) => {
    setPointSize(value);
    if (!potreeViewer) return;

    potreeViewer.scene.pointclouds.forEach(pc => {
      pc.material.size = value;
    });
  };

  const updatePointSizing = (value) => {
    setPointSizing(value);
    if (!potreeViewer || !window.Potree) return;

    const sizeType = value === 'FIXED' 
      ? window.Potree.PointSizeType.FIXED 
      : window.Potree.PointSizeType.ADAPTIVE;

    potreeViewer.scene.pointclouds.forEach(pc => {
      pc.material.pointSizeType = sizeType;
    });
  };

  const updateShape = (value) => {
    setShape(value);
    if (!potreeViewer || !window.Potree) return;

    const shapeType = value === 'CIRCLE' 
      ? window.Potree.PointShape.CIRCLE 
      : window.Potree.PointShape.SQUARE;

    potreeViewer.scene.pointclouds.forEach(pc => {
      pc.material.shape = shapeType;
    });
  };

  const updateOpacity = (value) => {
    setOpacity(value);
    if (!potreeViewer) return;

    potreeViewer.scene.pointclouds.forEach(pc => {
      pc.material.opacity = value;
    });
  };

  const updateDisplayMode = (value) => {
    setDisplayMode(value);
    if (!potreeViewer) return;

    const colorTypeMap = {
      'RGB': 'RGB',
      'ELEVATION': 'ELEVATION',
      'INTENSITY': 'INTENSITY',
      'CLASSIFICATION': 'CLASSIFICATION',
      'RETURN_NUMBER': 'RETURN_NUMBER'
    };

    const colorType = colorTypeMap[value];

    potreeViewer.scene.pointclouds.forEach((pc) => {
      const material = pc.material;
      material.pointColorType = colorType;
      
      // Set activeAttributeName to trigger visual update
      if (colorType === 'RGB') {
        material.activeAttributeName = 'rgba';
      } else if (colorType === 'INTENSITY') {
        material.activeAttributeName = 'intensity';
      } else if (colorType === 'CLASSIFICATION') {
        material.activeAttributeName = 'classification';
      } else if (colorType === 'ELEVATION') {
        material.activeAttributeName = 'elevation';
      }
    });
  };

  const toggleEDL = () => {
    const newValue = !edlEnabled;
    setEdlEnabled(newValue);
    if (potreeViewer) {
      potreeViewer.setEDLEnabled(newValue);
    }
  };

  const updatePointBudget = (value) => {
    setPointBudget(value);
    if (potreeViewer) {
      potreeViewer.setPointBudget(value);
    }
  };

  return (
    <div className="appearance-section">
      {/* Point Size */}
      <div className="control-group">
        <label htmlFor="point-size">
          Point Size
          <span className="control-value">{pointSize.toFixed(2)}</span>
        </label>
        <input
          id="point-size"
          type="range"
          min="0.1"
          max="3.0"
          step="0.05"
          value={pointSize}
          onChange={(e) => updatePointSize(parseFloat(e.target.value))}
          className="slider"
        />
      </div>

      {/* Point Sizing */}
      <div className="control-group">
        <label htmlFor="point-sizing">Point Sizing</label>
        <select
          id="point-sizing"
          value={pointSizing}
          onChange={(e) => updatePointSizing(e.target.value)}
          className="select"
        >
          <option value="FIXED">Fixed</option>
          <option value="ADAPTIVE">Adaptive</option>
        </select>
      </div>

      {/* Shape */}
      <div className="control-group">
        <label htmlFor="shape">Shape</label>
        <select
          id="shape"
          value={shape}
          onChange={(e) => updateShape(e.target.value)}
          className="select"
        >
          <option value="CIRCLE">Circle</option>
          <option value="SQUARE">Square</option>
        </select>
      </div>

      {/* Opacity */}
      <div className="control-group">
        <label htmlFor="opacity">
          Opacity
          <span className="control-value">{Math.round(opacity * 100)}%</span>
        </label>
        <input
          id="opacity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => updateOpacity(parseFloat(e.target.value))}
          className="slider"
        />
      </div>

      {/* Display Mode */}
      <div className="control-group">
        <label htmlFor="display-mode">Display Mode</label>
        <select
          id="display-mode"
          value={displayMode}
          onChange={(e) => updateDisplayMode(e.target.value)}
          className="select"
        >
          <option value="RGB">RGB</option>
          <option value="ELEVATION">Elevation</option>
          <option value="INTENSITY">Intensity</option>
          <option value="CLASSIFICATION">Classification</option>
          <option value="RETURN_NUMBER">Return Number</option>
        </select>
      </div>

      {/* Eye-Dome Lighting */}
      <div className="control-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={edlEnabled}
            onChange={toggleEDL}
            className="checkbox"
          />
          <span>Eye-Dome Lighting</span>
        </label>
      </div>

      {/* Point Budget (Quality) */}
      <div className="control-group">
        <label htmlFor="point-budget">Point Budget (Quality)</label>
        <select
          id="point-budget"
          value={pointBudget}
          onChange={(e) => updatePointBudget(parseInt(e.target.value))}
          className="select"
        >
          <option value="500000">Low (500K)</option>
          <option value="1000000">Medium (1M)</option>
          <option value="2000000">High (2M)</option>
          <option value="3000000">Very High (3M)</option>
          <option value="5000000">Ultra (5M)</option>
        </select>
      </div>
    </div>
  );
}
