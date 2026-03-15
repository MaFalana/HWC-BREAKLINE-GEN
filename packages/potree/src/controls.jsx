import { FaPlus, FaMinus } from 'react-icons/fa6';
import { MdCenterFocusStrong } from 'react-icons/md';

/**
 * PotreeControls - Zoom controls for 3D viewer
 * 
 * @param {Object} props
 * @param {Object} props.potreeViewer - Potree viewer instance
 * @param {Object} props.cesiumViewer - Cesium viewer instance
 */
export function PotreeControls({ potreeViewer, cesiumViewer }) {
  const handleZoomIn = () => {
    if (cesiumViewer) {
      const camera = cesiumViewer.camera;
      const distance = window.Cesium.Cartesian3.distance(camera.position, camera.positionWC);
      camera.moveForward(distance * 0.2);
    } else if (potreeViewer) {
      const viewer = potreeViewer;
      const currentSpeed = viewer.getMoveSpeed();
      viewer.setMoveSpeed(currentSpeed * 0.5);

      const camera = viewer.scene.getActiveCamera();
      const forward = new window.THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.multiplyScalar(currentSpeed * 5);
      camera.position.add(forward);

      setTimeout(() => viewer.setMoveSpeed(currentSpeed), 100);
    }
  };

  const handleZoomOut = () => {
    if (cesiumViewer) {
      const camera = cesiumViewer.camera;
      const distance = window.Cesium.Cartesian3.distance(camera.position, camera.positionWC);
      camera.moveBackward(distance * 0.2);
    } else if (potreeViewer) {
      const viewer = potreeViewer;
      const currentSpeed = viewer.getMoveSpeed();
      viewer.setMoveSpeed(currentSpeed * 0.5);

      const camera = viewer.scene.getActiveCamera();
      const forward = new window.THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.multiplyScalar(currentSpeed * 5);
      camera.position.sub(forward);

      setTimeout(() => viewer.setMoveSpeed(currentSpeed), 100);
    }
  };

  const handleResetView = () => {
    if (cesiumViewer && window.wgs84Center && window.Cesium) {
      const altitude = window.wgs84Center.z || 1000;
      cesiumViewer.camera.flyTo({
        destination: window.Cesium.Cartesian3.fromDegrees(
          window.wgs84Center.lon,
          window.wgs84Center.lat,
          altitude + 2000
        ),
        orientation: {
          heading: window.Cesium.Math.toRadians(0),
          pitch: window.Cesium.Math.toRadians(-45),
          roll: 0.0
        },
        duration: 1.5
      });
    } else if (potreeViewer) {
      potreeViewer.fitToScreen();
    }
  };

  return (
    <div className="hwc-potree-controls">
      <button
        onClick={handleZoomOut}
        className="hwc-potree-control-btn"
        aria-label="Zoom out"
        title="Zoom Out"
      >
        <FaMinus />
      </button>

      <button
        onClick={handleResetView}
        className="hwc-potree-control-btn"
        aria-label="Reset view"
        title="Reset Camera"
      >
        <MdCenterFocusStrong />
      </button>

      <button
        onClick={handleZoomIn}
        className="hwc-potree-control-btn"
        aria-label="Zoom in"
        title="Zoom In"
      >
        <FaPlus />
      </button>
    </div>
  );
}
