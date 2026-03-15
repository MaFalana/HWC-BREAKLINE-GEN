import { useState, useEffect } from 'react';

// Potree icon helper - handles both SVG and PNG
const PotreeIcon = ({ name, className = '' }) => {
  const ext = name === 'angle' ? 'png' : 'svg';
  return (
    <img 
      src={`/potree/1.8.2/build/potree/resources/icons/${name}.${ext}`} 
      alt={name}
      className={`potree-icon ${className}`}
      style={{ width: '20px', height: '20px', filter: 'invert(1)' }}
    />
  );
};

export function ToolsSection({ potreeViewer }) {
  const [activeTool, setActiveTool] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // Check if measuring tool is ready
  useEffect(() => {
    if (!potreeViewer) return;

    const checkReady = () => {
      if (potreeViewer.measuringTool) {
        setIsReady(true);
      }
    };

    // Check immediately
    checkReady();

    // Also check periodically until ready
    const readyInterval = setInterval(() => {
      if (potreeViewer.measuringTool) {
        setIsReady(true);
        clearInterval(readyInterval);
      }
    }, 100);

    return () => clearInterval(readyInterval);
  }, [potreeViewer]);

  // Track measurements from Potree
  useEffect(() => {
    if (!potreeViewer) return;

    const updateMeasurements = () => {
      const scene = potreeViewer.scene;
      if (scene && scene.measurements) {
        // Filter out incomplete measurements
        const completeMeasurements = scene.measurements.filter(m => {
          // Check different possible point storage locations
          if (m.points && m.points.length > 0) {
            return true;
          }
          if (m.spheres && m.spheres.length > 0) {
            return true;
          }
          if (m.coordinates && m.coordinates.length > 0) {
            return true;
          }
          // For measurements that might not have points array yet
          // Check if it has a position or any markers
          if (m.position) {
            return true;
          }
          return false;
        });
        setMeasurements(completeMeasurements);
      }
    };

    // Poll for measurement changes (Potree doesn't have events for this)
    const interval = setInterval(updateMeasurements, 500);

    return () => clearInterval(interval);
  }, [potreeViewer]);

  const activateTool = (toolType) => {
    if (!potreeViewer || !window.Potree || !potreeViewer.measuringTool) {
      return;
    }

    // Deactivate current tool
    if (activeTool && potreeViewer.measuringTool) {
      try {
        if (potreeViewer.measuringTool.cancel) {
          potreeViewer.measuringTool.cancel();
        } else if (potreeViewer.measuringTool.reset) {
          potreeViewer.measuringTool.reset();
        }
      } catch (err) {
        // Silently handle deactivation errors
      }
    }

    // Activate new tool or deactivate if clicking same tool
    if (activeTool === toolType) {
      setActiveTool(null);
      return;
    }

    setActiveTool(toolType);

    // Ensure measuring tool exists
    if (!potreeViewer.measuringTool) {
      console.error('Measuring tool not available on viewer');
      return;
    }

    // Activate Potree measurement tool
    try {
      switch (toolType) {
        case 'distance':
          potreeViewer.measuringTool.startInsertion({
            showDistances: true,
            showAngles: false,
            showArea: false,
            closed: false,
            maxMarkers: 2,
            name: 'Distance'
          });
          break;
      
      case 'polyline':
        potreeViewer.measuringTool.startInsertion({
          showDistances: true,
          showAngles: false,
          showArea: false,
          closed: false,
          maxMarkers: Infinity,
          name: 'Polyline'
        });
        break;
      
      case 'point':
        potreeViewer.measuringTool.startInsertion({
          showDistances: false,
          showCoordinates: true,
          showAngles: false,
          showArea: false,
          closed: false,
          maxMarkers: 1,
          name: 'Point'
        });
        break;
      
      case 'height':
        potreeViewer.measuringTool.startInsertion({
          showDistances: false,
          showHeight: true,
          showAngles: false,
          showArea: false,
          closed: false,
          maxMarkers: 2,
          name: 'Height'
        });
        break;
      
      case 'area':
        potreeViewer.measuringTool.startInsertion({
          showDistances: false,
          showAngles: false,
          showArea: true,
          closed: true,
          maxMarkers: Infinity,
          name: 'Area'
        });
        break;
      
      case 'angle':
        potreeViewer.measuringTool.startInsertion({
          showDistances: false,
          showAngles: true,
          showArea: false,
          closed: false,
          maxMarkers: 3,
          name: 'Angle'
        });
        break;
      
      case 'circle':
        potreeViewer.measuringTool.startInsertion({
          showDistances: false,
          showRadius: true,
          showArea: true,
          closed: true,
          maxMarkers: 3,
          name: 'Circle'
        });
        break;
      
      case 'azimuth':
        potreeViewer.measuringTool.startInsertion({
          showDistances: false,
          showAzimuth: true,
          showAngles: false,
          showArea: false,
          closed: false,
          maxMarkers: 2,
          name: 'Azimuth'
        });
        break;
      
      case 'volume':
        if (potreeViewer.volumeTool) {
          potreeViewer.volumeTool.startInsertion();
        }
        break;
        
      default:
        break;
      }
    } catch (err) {
      setActiveTool(null);
    }
  };

  const removeMeasurement = (measurement) => {
    if (!potreeViewer) return;
    
    const scene = potreeViewer.scene;
    if (scene) {
      scene.removeMeasurement(measurement);
      setMeasurements(prev => prev.filter(m => m !== measurement));
    }
  };

  const tools = [
    { id: 'distance', label: 'Distance', icon: <PotreeIcon name="distance" /> },
    { id: 'polyline', label: 'Polyline', icon: <PotreeIcon name="distance" /> },
    { id: 'point', label: 'Point', icon: <PotreeIcon name="point" /> },
    { id: 'height', label: 'Height', icon: <PotreeIcon name="height" /> },
    { id: 'area', label: 'Area', icon: <PotreeIcon name="area" /> },
    { id: 'angle', label: 'Angle', icon: <PotreeIcon name="angle" /> },
    { id: 'circle', label: 'Circle', icon: <PotreeIcon name="circle" /> },
    { id: 'azimuth', label: 'Azimuth', icon: <PotreeIcon name="azimuth" /> },
    { id: 'volume', label: 'Volume', icon: <PotreeIcon name="volume" /> },
  ];

  return (
    <div className="tools-section">
      {!isReady ? (
        <div className="tool-loading">
          <p>Loading point cloud...</p>
        </div>
      ) : (
        <div className="tool-grid">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => activateTool(tool.id)}
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={activeTool === tool.id}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      )}



      {/* Active Tool Instructions */}
      {activeTool && (
        <div className="tool-instructions">
          <p>
            {activeTool === 'distance' && 'Click two points to measure distance'}
            {activeTool === 'polyline' && 'Click multiple points. Left-click to finish.'}
            {activeTool === 'point' && 'Click to place a point and show coordinates'}
            {activeTool === 'height' && 'Click two points to measure vertical height'}
            {activeTool === 'area' && 'Click to draw polygon. Left-click to close.'}
            {activeTool === 'angle' && 'Click three points to measure angle'}
            {activeTool === 'circle' && 'Click three points to define a circle'}
            {activeTool === 'azimuth' && 'Click two points to measure azimuth/bearing'}
            {activeTool === 'volume' && 'Click to define volume boundary'}
          </p>
        </div>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <div className="measurements-list">
          <div className="measurements-header">
            <span>Measurements ({measurements.length})</span>
          </div>
          {measurements.map((measurement, index) => (
            <MeasurementItem
              key={index}
              measurement={measurement}
              onRemove={() => removeMeasurement(measurement)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MeasurementItem({ measurement, onRemove }) {
  const getMeasurementInfo = () => {
    if (!measurement) return { type: 'Unknown', value: '' };
    
    const name = measurement.name || 'Measurement';
    
    // Try to get measurement values safely
    try {
      if (typeof measurement.getTotalDistance === 'function') {
        const distance = measurement.getTotalDistance();
        if (distance > 0) {
          return { type: name, value: `${distance.toFixed(2)} ft` };
        }
      }
    } catch (e) {
      // Ignore
    }
    
    try {
      if (typeof measurement.getArea === 'function') {
        const area = measurement.getArea();
        if (area > 0) {
          return { type: name, value: `${area.toFixed(2)} ft²` };
        }
      }
    } catch (e) {
      // Ignore
    }
    
    // For point measurements, try to get coordinates
    try {
      if (measurement.points && measurement.points.length > 0) {
        const point = measurement.points[0];
        if (point && point.position) {
          const pos = point.position;
          return { 
            type: name, 
            value: `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}` 
          };
        }
      }
    } catch (e) {
      // Ignore
    }
    
    return { type: name, value: 'In progress...' };
  };

  const info = getMeasurementInfo();

  return (
    <div className="measurement-item">
      <div className="measurement-info">
        <span className="measurement-type">{info.type}</span>
        {info.value && <span className="measurement-value">{info.value}</span>}
      </div>
      <button
        className="measurement-remove"
        onClick={onRemove}
        aria-label="Remove measurement"
        title="Remove"
      >
        <PotreeIcon name="remove" />
      </button>
    </div>
  );
}
