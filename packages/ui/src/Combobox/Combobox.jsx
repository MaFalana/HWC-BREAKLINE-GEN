import React, { useState, useRef, useEffect } from "react";
import "./combobox.css";

/**
 * Generic Combobox Component
 * 
 * Searchable dropdown with keyboard navigation.
 * 
 * @param {string} value - Currently selected value
 * @param {Function} onChange - Callback when selection changes (value, option)
 * @param {Array} options - Array of option objects with { value, label }
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Disable the combobox
 * @param {string} label - Optional label text
 * @param {boolean} required - Mark as required field
 * @param {string} error - Error message to display
 * @param {string} name - Form field name
 * @param {boolean} clearable - Show clear button when value is selected
 * @param {React.Component} ClearIcon - Custom clear icon component
 * @param {string} searchBy - Field to search by (defaults to 'label')
 */
export function Combobox({
  value = "",
  onChange,
  options = [],
  placeholder = "Search or select...",
  disabled = false,
  label,
  required = false,
  error,
  name,
  clearable = true,
  ClearIcon,
  searchBy = "label"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const wrapperRef = useRef(null);

  // Get display label for selected value
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : "";

  // Filter options based on search
  const filteredOptions = options.filter(option => {
    const searchField = option[searchBy] || option.label;
    return searchField.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option) => {
    if (onChange) {
      onChange(option.value, option);
    }
    setIsOpen(false);
    setSearchTerm("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        inputRef.current?.blur();
        break;
      case "Tab":
        setIsOpen(false);
        setSearchTerm("");
        break;
      default:
        break;
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange("", null);
    }
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const comboboxId = React.useId();
  const errorId = React.useId();
  const listboxId = React.useId();

  // Default clear icon (X)
  const DefaultClearIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const ClearButton = ClearIcon || DefaultClearIcon;

  return (
    <div className="hwc-combobox-wrapper" ref={wrapperRef}>
      {label && (
        <label htmlFor={comboboxId} className="hwc-combobox-label">
          {label}
          {required && <span className="hwc-combobox-required" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="hwc-combobox-container">
        <input
          ref={inputRef}
          id={comboboxId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className={`hwc-combobox-input ${error ? "hwc-combobox-error" : ""}`}
          placeholder={placeholder}
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          disabled={disabled}
          autoComplete="off"
        />
        
        {clearable && value && !disabled && (
          <button
            type="button"
            className="hwc-combobox-clear"
            onClick={handleClear}
            aria-label="Clear selection"
            tabIndex={-1}
          >
            <ClearButton />
          </button>
        )}
        
        <button
          type="button"
          className="hwc-combobox-toggle"
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }
          }}
          disabled={disabled}
          aria-label="Toggle dropdown"
          tabIndex={-1}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isOpen && !disabled && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="hwc-combobox-listbox"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  className={`hwc-combobox-option ${
                    option.value === value ? "is-selected" : ""
                  } ${index === highlightedIndex ? "is-highlighted" : ""}`}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="hwc-combobox-no-results">No results found</li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <div id={errorId} className="hwc-combobox-error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default Combobox;
