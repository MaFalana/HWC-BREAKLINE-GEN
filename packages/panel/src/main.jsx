import './panel.css';
import { FaChevronLeft, FaXmark } from 'react-icons/fa6';

export function HwcPanel({ 
  isOpen, 
  onToggle, 
  title = "Panel",
  toggleLabel = "Open Panel",
  position = "left", // "left" or "right"
  children 
}) {
  const isLeft = position === "left";
  const ChevronIcon = isLeft ? FaChevronLeft : FaChevronLeft;

  if (!isOpen) {
    return (
      <button 
        className={`hwc-panel-toggle collapsed ${position}`}
        onClick={onToggle}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        <ChevronIcon style={{ transform: isLeft ? 'rotate(180deg)' : 'none' }} />
      </button>
    );
  }

  return (
    <div className={`hwc-panel ${position}`}>
      <div className="hwc-panel-header">
        <h3>{title}</h3>
        <button 
          className="hwc-panel-close"
          onClick={onToggle}
          aria-label="Close panel"
        >
          <FaXmark />
        </button>
      </div>

      <div className="hwc-panel-content">
        {children}
      </div>
    </div>
  );
}