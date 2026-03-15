export function MapAttribution() {
  return (
    <div className="hwc-map-attribution">
      <a href="https://www.hwcengineering.com/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <b>© {new Date().getFullYear()} HWC Engineering</b>
      </a>
      {' | '}
      <a 
        href="https://www.maptiler.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'inherit' }}
      >
        © MapTiler
      </a>
      {' | '}
      <a 
        href="https://www.openstreetmap.org/" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'inherit' }}
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
