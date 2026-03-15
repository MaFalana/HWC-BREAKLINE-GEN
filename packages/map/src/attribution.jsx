export function MapAttribution({ baseLayer = 'streets' }) {
  return (
    <div className="hwc-map-attribution">
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
    </div>
  );
}
