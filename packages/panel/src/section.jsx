import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

export function PanelSection({ 
  title, 
  icon, 
  iconPath,
  isExpanded, 
  onToggle, 
  children 
}) {
  return (
    <div className="panel-section">
      <button 
        className="panel-section-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="panel-section-title">
          {icon && (
            <span className="panel-section-icon-wrapper">
              {icon}
            </span>
          )}
          {iconPath && (
            <img 
              src={iconPath}
              alt={title}
              className="panel-section-icon"
            />
          )}
          <span>{title}</span>
        </div>
        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      
      {isExpanded && (
        <div className="panel-section-content">
          {children}
        </div>
      )}
    </div>
  );
}