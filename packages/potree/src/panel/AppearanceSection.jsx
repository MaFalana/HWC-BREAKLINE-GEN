import { useState, useEffect } from 'react';
import { Select } from './Select.jsx';

// Standard LAS classification codes
const CLASSIFICATIONS = {
  0: { name: 'Never Classified', color: [0.5, 0.5, 0.5] },
  1: { name: 'Unclassified', color: [0.5, 0.5, 0.5] },
  2: { name: 'Ground', color: [0.63, 0.32, 0.18] },
  3: { name: 'Low Vegetation', color: [0.0, 1.0, 0.0] },
  4: { name: 'Medium Vegetation', color: [0.0, 0.8, 0.0] },
  5: { name: 'High Vegetation', color: [0.0, 0.6, 0.0] },
  6: { name: 'Building', color: [1.0, 0.66, 0.0] },
  7: { name: 'Low Point (Noise)', color: [1.0, 0.0, 1.0] },
  8: { name: 'Reserved', color: [1.0, 0.0, 0.0] },
  9: { name: 'Water', color: [0.0, 0.0, 1.0] },
  10: { name: 'Rail', color: [0.8, 0.8, 1.0] },
  11: { name: 'Road Surface', color: [0.4, 0.4, 0.4] },
  12: { name: 'Reserved', color: [1.0, 1.0, 0.0] },
  13: { name: 'Wire - Guard', color: [0.0, 0.0, 0.0] },
  14: { name: 'Wire - Conductor', color: [0.0, 0.55, 0.55] },
  15: { name: 'Transmission Tower', color: [0.0, 0.4, 0.4] },
  16: { name: 'Wire - Connector', color: [0.0, 0.5, 0.0] },
  17: { name: 'Bridge Deck', color: [0.5, 0.3, 0.0] },
  18: { name: 'High Noise', color: [1.0, 0.0, 1.0] }
};

export function AppearanceSection({ potreeViewer }) {
  const [pointSize, setPointSize] = useState(0.30);
  const [pointSizing, setPointSizing] = useState('FIXED');
  const [shape, setShape] = useState('CIRCLE');
  const [displayMode, setDisplayMode] = useState('RGB');
  const [edlEnabled, setEdlEnabled] = useState(true);
  const [pointBudget, setPointBudget] = useState(2000000);
  
  // Classification visibility state
  const [classifications, setClassifications] = useState(() => {
    const initial = {};
    Object.keys(CLASSIFICATIONS).forEach(key => {
      initial[key] = true; // All visible by default
    });
    return initial;
  });
  
  // Elevation range state
  const [elevationRange, setElevationRange] = useState([0, 100]);
  const [elevationBounds, setElevationBounds] = useState([0, 100]);
  
  // Intensity range state
  const [intensityRange, setIntensityRange] = useState([0, 65535]);
  const [intensityBounds, setIntensityBounds] = useState([0, 65535]);

  // Initialize from viewer
  useEffect(() => {
    if (!potreeViewer || !window.Potree) return;

    const pointclouds = potreeViewer.scene.pointclouds;
    if (pointclouds.length > 0) {
      const material = pointclouds[0].material;
      const pc = pointclouds[0];
      
      setPointSize(material.size || 0.30);
      setPointSizing(material.pointSizeType === window.Potree.PointSizeType.FIXED ? 'FIXED' : 'ADAPTIVE');
      setShape(material.shape === window.Potree.PointShape.CIRCLE ? 'CIRCLE' : 'SQUARE');
      
      // Get elevation bounds from point cloud
      if (pc.boundingBox) {
        const min = pc.boundingBox.min.z;
        const max = pc.boundingBox.max.z;
        setElevationBounds([min, max]);
        setElevationRange([min, max]);
        
        // Initialize material elevation range
        if (material.elevationRange) {
          material.elevationRange = [min, max];
        }
      }
      
      // Get intensity bounds (typically 0-65535 for 16-bit)
      setIntensityBounds([0, 65535]);
      setIntensityRange([0, 65535]);
      
      // Initialize material intensity range
      if (material.intensityRange) {
        material.intensityRange = [0, 65535];
      }
      
      // Initialize classifications from material
      if (material.classification) {
        const classVis = {};
        Object.keys(CLASSIFICATIONS).forEach(key => {
          const classNum = parseInt(key);
          if (material.classification[classNum]) {
            classVis[key] = material.classification[classNum].visible !== false;
          } else {
            classVis[key] = true;
          }
        });
        setClassifications(classVis);
      }
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
  
  const toggleClassification = (classNum) => {
    const newClassifications = {
      ...classifications,
      [classNum]: !classifications[classNum]
    };
    setClassifications(newClassifications);
    
    if (!potreeViewer) return;
    
    potreeViewer.scene.pointclouds.forEach(pc => {
      const material = pc.material;
      if (!material.classification) {
        material.classification = {};
      }
      
      // Update classification visibility
      if (!material.classification[classNum]) {
        material.classification[classNum] = {
          visible: newClassifications[classNum],
          color: CLASSIFICATIONS[classNum]?.color || [1, 1, 1]
        };
      } else {
        material.classification[classNum].visible = newClassifications[classNum];
      }
      
      // Trigger material update
      material.recomputeClassification();
    });
  };
  
  const toggleAllClassifications = () => {
    // Check if all are currently selected
    const allSelected = Object.values(classifications).every(v => v);
    const newValue = !allSelected;
    
    const newClassifications = {};
    Object.keys(CLASSIFICATIONS).forEach(key => {
      newClassifications[key] = newValue;
    });
    setClassifications(newClassifications);
    
    if (!potreeViewer) return;
    
    potreeViewer.scene.pointclouds.forEach(pc => {
      const material = pc.material;
      if (!material.classification) {
        material.classification = {};
      }
      
      // Update all classifications
      Object.keys(CLASSIFICATIONS).forEach(classNum => {
        const num = parseInt(classNum);
        if (!material.classification[num]) {
          material.classification[num] = {
            visible: newValue,
            color: CLASSIFICATIONS[classNum]?.color || [1, 1, 1]
          };
        } else {
          material.classification[num].visible = newValue;
        }
      });
      
      // Trigger material update
      material.recomputeClassification();
    });
  };
  
  const updateElevationRange = (min, max) => {
    setElevationRange([min, max]);
    
    if (!potreeViewer) return;
    
    potreeViewer.scene.pointclouds.forEach(pc => {
      const material = pc.material;
      material.elevationRange = [min, max];
    });
  };
  
  const updateIntensityRange = (min, max) => {
    setIntensityRange([min, max]);
    
    if (!potreeViewer) return;
    
    potreeViewer.scene.pointclouds.forEach(pc => {
      const material = pc.material;
      material.intensityRange = [min, max];
    });
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
        <Select
          label="Point Sizing"
          value={pointSizing}
          onChange={updatePointSizing}
          options={[
            { value: 'FIXED', label: 'Fixed' },
            { value: 'ADAPTIVE', label: 'Adaptive' }
          ]}
        />
      </div>

      {/* Shape */}
      <div className="control-group">
        <Select
          label="Shape"
          value={shape}
          onChange={updateShape}
          options={[
            { value: 'CIRCLE', label: 'Circle' },
            { value: 'SQUARE', label: 'Square' }
          ]}
        />
      </div>

      {/* Display Mode */}
      <div className="control-group">
        <Select
          label="Display Mode"
          value={displayMode}
          onChange={updateDisplayMode}
          options={[
            { value: 'RGB', label: 'RGB' },
            { value: 'ELEVATION', label: 'Elevation' },
            { value: 'INTENSITY', label: 'Intensity' },
            { value: 'CLASSIFICATION', label: 'Classification' },
            { value: 'RETURN_NUMBER', label: 'Return Number' }
          ]}
        />
      </div>

      {/* Elevation Range - Only show when in ELEVATION mode */}
      {displayMode === 'ELEVATION' && (
        <div className="control-group">
          <label>Elevation Range</label>
          <div className="range-controls">
            <div className="range-input">
              <label htmlFor="elevation-min">
                Min
                <span className="control-value">{elevationRange[0].toFixed(1)} ft</span>
              </label>
              <input
                id="elevation-min"
                type="range"
                min={elevationBounds[0]}
                max={elevationBounds[1]}
                step={(elevationBounds[1] - elevationBounds[0]) / 100}
                value={elevationRange[0]}
                onChange={(e) => updateElevationRange(parseFloat(e.target.value), elevationRange[1])}
                className="slider"
              />
            </div>
            <div className="range-input">
              <label htmlFor="elevation-max">
                Max
                <span className="control-value">{elevationRange[1].toFixed(1)} ft</span>
              </label>
              <input
                id="elevation-max"
                type="range"
                min={elevationBounds[0]}
                max={elevationBounds[1]}
                step={(elevationBounds[1] - elevationBounds[0]) / 100}
                value={elevationRange[1]}
                onChange={(e) => updateElevationRange(elevationRange[0], parseFloat(e.target.value))}
                className="slider"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Intensity Range - Only show when in INTENSITY mode */}
      {displayMode === 'INTENSITY' && (
        <div className="control-group">
          <label>Intensity Range</label>
          <div className="range-controls">
            <div className="range-input">
              <label htmlFor="intensity-min">
                Min
                <span className="control-value">{Math.round(intensityRange[0])}</span>
              </label>
              <input
                id="intensity-min"
                type="range"
                min={intensityBounds[0]}
                max={intensityBounds[1]}
                step={(intensityBounds[1] - intensityBounds[0]) / 100}
                value={intensityRange[0]}
                onChange={(e) => updateIntensityRange(parseFloat(e.target.value), intensityRange[1])}
                className="slider"
              />
            </div>
            <div className="range-input">
              <label htmlFor="intensity-max">
                Max
                <span className="control-value">{Math.round(intensityRange[1])}</span>
              </label>
              <input
                id="intensity-max"
                type="range"
                min={intensityBounds[0]}
                max={intensityBounds[1]}
                step={(intensityBounds[1] - intensityBounds[0]) / 100}
                value={intensityRange[1]}
                onChange={(e) => updateIntensityRange(intensityRange[0], parseFloat(e.target.value))}
                className="slider"
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Classification Filters - Available in all modes */}
      <div className="control-group">
        <label>Classification Filters</label>
        <button
          onClick={toggleAllClassifications}
          className="control-btn classification-toggle-all"
        >
          {Object.values(classifications).every(v => v) ? 'Deselect All' : 'Select All'}
        </button>
        <div className="classification-list">
          {Object.entries(CLASSIFICATIONS).map(([classNum, classInfo]) => (
            <label key={classNum} className="checkbox-label classification-item">
              <input
                type="checkbox"
                checked={classifications[classNum]}
                onChange={() => toggleClassification(parseInt(classNum))}
                className="checkbox"
              />
              <span 
                className="classification-color" 
                style={{ 
                  backgroundColor: `rgb(${classInfo.color.map(c => c * 255).join(',')})` 
                }}
              />
              <span className="classification-name">{classInfo.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Point Budget (Quality) */}
      <div className="control-group">
        <Select
          label="Point Budget (Quality)"
          value={pointBudget}
          onChange={(val) => updatePointBudget(parseInt(val))}
          options={[
            { value: '500000', label: 'Low (500K)' },
            { value: '1000000', label: 'Medium (1M)' },
            { value: '2000000', label: 'High (2M)' },
            { value: '3000000', label: 'Very High (3M)' },
            { value: '5000000', label: 'Ultra (5M)' }
          ]}
        />
      </div>
    </div>
  );
}
