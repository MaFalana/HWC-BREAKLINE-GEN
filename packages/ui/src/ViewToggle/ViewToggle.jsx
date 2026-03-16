import './view-toggle.css';

export function ViewToggle({ 
  views = [],
  value,
  onChange,
  hideMobile = []
}) {
  return (
    <div className="hwc-view-toggle">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onChange?.(view.id)}
          className={`hwc-view-toggle__btn ${value === view.id ? 'active' : ''} ${
            hideMobile.includes(view.id) ? 'hide-mobile' : ''
          }`}
          aria-label={view.label}
          type="button"
        >
          {view.icon}
        </button>
      ))}
    </div>
  );
}
