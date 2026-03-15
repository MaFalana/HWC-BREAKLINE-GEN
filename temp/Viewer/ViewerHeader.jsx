import '../../styles/header.css';

export function ViewerHeader({ project }) {
  const displayName = project?.name || project?.id || 'Unknown Project';
  
  return (
    <header className="app-header">
      <div className="hdr-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img 
              src="/assets/HWC-Logo-Light.png" 
              alt="HWC Engineering" 
              className="brand-logo"
              style={{ cursor: 'pointer' }}
            />
          </a>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>|</span>
          <span style={{ 
            color: 'var(--hdr-fg)', 
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
