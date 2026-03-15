import { FaCamera, FaDownload, FaLink } from 'react-icons/fa6';

export function ExportSection({ potreeViewer, cesiumViewer }) {
  
  const takeScreenshot = () => {
    if (!potreeViewer) return;

    try {
      // Use Potree's built-in screenshot method if available
      if (window.Potree && window.Potree.utils && window.Potree.utils.screenPass) {
        // Potree has a screenshot utility
        const screenshot = window.Potree.utils.screenPass.render(potreeViewer.renderer);
        
        // Download the screenshot
        const link = document.createElement('a');
        link.href = screenshot;
        link.download = `pointcloud-${Date.now()}.png`;
        link.click();
      } else {
        // Fallback to manual canvas export
        potreeViewer.render();
        const canvas = potreeViewer.renderer.domElement;
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `pointcloud-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        });
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };

  const exportCameraPosition = () => {
    if (!potreeViewer) return;

    const camera = potreeViewer.scene.getActiveCamera();
    const position = camera.position;
    const target = potreeViewer.scene.view.getPivot();

    const cameraData = {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      fov: potreeViewer.getFOV()
    };

    const dataStr = JSON.stringify(cameraData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `camera-position-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Potree's GeoJSON export logic (extracted from Potree source)
  const measurementToGeoJSONFeatures = (measurement) => {
    const coords = measurement.points.map(p => p.position.toArray());
    const features = [];

    if (coords.length === 1) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords[0] },
        properties: { name: measurement.name }
      });
    } else if (coords.length > 1 && !measurement.closed) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { name: measurement.name }
      });
    } else if (coords.length > 1 && measurement.closed) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
        properties: { name: measurement.name }
      });
    }

    if (measurement.showDistances && measurement.edgeLabels) {
      measurement.edgeLabels.forEach(label => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: label.position.toArray() },
          properties: { distance: label.text }
        });
      });
    }

    if (measurement.showArea && measurement.areaLabel) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: measurement.areaLabel.position.toArray() },
        properties: { area: measurement.areaLabel.text }
      });
    }

    return features;
  };

  const exportMeasurementsGeoJSON = () => {
    if (!potreeViewer) return;
    
    const measurements = potreeViewer.scene.measurements || [];
    if (measurements.length === 0) {
      alert('No measurements to export');
      return;
    }

    try {
      let features = [];
      for (const measurement of measurements) {
        const f = measurementToGeoJSONFeatures(measurement);
        features = features.concat(f);
      }

      const geojson = {
        type: 'FeatureCollection',
        features: features
      };

      const geoJsonStr = JSON.stringify(geojson, null, '\t');
      const blob = new Blob([geoJsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `measurements-${Date.now()}.geojson`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export measurements.');
    }
  };
  
  // Potree's DXF export logic (extracted from Potree source)
  const measurementToDXFSection = (measurement) => {
    if (measurement.points.length === 0) {
      return '';
    } else if (measurement.points.length === 1) {
      // Point measurement
      const pos = measurement.points[0].position;
      return `0
CIRCLE
8
layer_point
10
${pos.x}
20
${pos.y}
30
${pos.z}
40
1.0
`;
    } else {
      // Polyline measurement
      const geomCode = measurement.closed ? 9 : 8;
      let dxf = `0
POLYLINE
8
layer_polyline
62
1
66
1
10
0.0
20
0.0
30
0.0
70
${geomCode}
`;
      
      for (const point of measurement.points) {
        const pos = point.position;
        dxf += `0
VERTEX
8
0
10
${pos.x}
20
${pos.y}
30
${pos.z}
70
32
`;
      }
      
      dxf += `0
SEQEND
`;
      return dxf;
    }
  };

  const exportMeasurementsDXF = () => {
    if (!potreeViewer) return;
    
    const measurements = potreeViewer.scene.measurements || [];
    if (measurements.length === 0) {
      alert('No measurements to export');
      return;
    }

    try {
      // Calculate bounding box
      const points = measurements
        .map(m => m.points)
        .flat()
        .map(p => p.position);
      
      let min = { x: Infinity, y: Infinity, z: Infinity };
      let max = { x: -Infinity, y: -Infinity, z: -Infinity };
      
      for (const point of points) {
        min.x = Math.min(min.x, point.x);
        min.y = Math.min(min.y, point.y);
        min.z = Math.min(min.z, point.z);
        max.x = Math.max(max.x, point.x);
        max.y = Math.max(max.y, point.y);
        max.z = Math.max(max.z, point.z);
      }

      const dxfHeader = `999
DXF created from potree
0
SECTION
2
HEADER
9
$ACADVER
1
AC1006
9
$INSBASE
10
0.0
20
0.0
30
0.0
9
$EXTMIN
10
${min.x}
20
${min.y}
30
${min.z}
9
$EXTMAX
10
${max.x}
20
${max.y}
30
${max.z}
0
ENDSEC
`;

      let dxfBody = `0
SECTION
2
ENTITIES
`;

      for (const measurement of measurements) {
        dxfBody += measurementToDXFSection(measurement);
      }

      dxfBody += `0
ENDSEC
`;

      const dxf = dxfHeader + dxfBody + '0\nEOF';

      const blob = new Blob([dxf], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `measurements-${Date.now()}.dxf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export DXF:', error);
      alert('Failed to export DXF.');
    }
  };

  const copyShareableLink = () => {
    // Get current URL with camera position as query params
    const url = new URL(window.location.href);
    
    if (potreeViewer) {
      const camera = potreeViewer.scene.getActiveCamera();
      const position = camera.position;
      
      url.searchParams.set('camX', position.x.toFixed(2));
      url.searchParams.set('camY', position.y.toFixed(2));
      url.searchParams.set('camZ', position.z.toFixed(2));
      url.searchParams.set('fov', potreeViewer.getFOV());
    }

    navigator.clipboard.writeText(url.toString()).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  return (
    <div className="export-section">
      <button className="control-btn" onClick={takeScreenshot}>
        <FaCamera />
        <span>Screenshot</span>
      </button>

      <button className="control-btn" onClick={exportCameraPosition}>
        <FaDownload />
        <span>Export Camera</span>
      </button>

      <button className="control-btn" onClick={exportMeasurementsGeoJSON}>
        <FaDownload />
        <span>Export JSON</span>
      </button>

      <button className="control-btn" onClick={exportMeasurementsDXF}>
        <FaDownload />
        <span>Export DXF</span>
      </button>

      <button className="control-btn" onClick={copyShareableLink}>
        <FaLink />
        <span>Copy Shareable Link</span>
      </button>
    </div>
  );
}
