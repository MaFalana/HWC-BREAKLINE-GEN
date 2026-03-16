import { MdOutlineSort } from "react-icons/md";
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './sort-dropdown.css';

export function SortDropdown({ 
  options = [],
  value,
  onChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange?.(option.value, option.order);
    setIsOpen(false);
  };

  const currentLabel = options.find(
    opt => opt.value === value?.value && opt.order === value?.order
  )?.label || options.find(
    opt => opt.value === value?.sortBy && opt.order === value?.sortOrder
  )?.label || 'Sort';

  return (
    <div className="hwc-sort">
      <button 
        ref={buttonRef}
        className="hwc-sort__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Sort options"
        type="button"
      >
        <MdOutlineSort />
        <span>{currentLabel}</span>
      </button>

      {isOpen && createPortal(
        <>
          <div className="hwc-sort__backdrop" onClick={() => setIsOpen(false)} />
          <div 
            className="hwc-sort__dropdown"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            {options.map((option, index) => (
              <button
                key={index}
                className={`hwc-sort__option ${
                  (value?.value === option.value && value?.order === option.order) ||
                  (value?.sortBy === option.value && value?.sortOrder === option.order)
                    ? 'active' 
                    : ''
                }`}
                onClick={() => handleSelect(option)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
