/**
 * PotreeAttribution - Attribution footer for 3D viewer
 * Shows credits based on active base layer
 */
export function PotreeAttribution({ baseLayer = 'satellite' }) {
  return (
    <div className="hwc-potree-attribution">
      <a href="https://www.hwcengineering.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        <b>© {new Date().getFullYear()} HWC Engineering</b>
      </a>
      {' | '}
      {baseLayer === 'satellite' ? (
        <a
          href="https://www.esri.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          © Esri, Maxar, Earthstar Geographics
        </a>
      ) : (
        <a
          href="https://www.openstreetmap.org/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          © OpenStreetMap contributors
        </a>
      )}
      {' | '}
      <span>Powered by Potree & Cesium</span>
    </div>
  );
}

