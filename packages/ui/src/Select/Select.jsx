import React from "react";
import "./select.css";

/**
 * Generic Select Component
 * 
 * Reusable dropdown/select component for forms.
 * 
 * @param {string} value - Currently selected value
 * @param {Function} onChange - Callback when selection changes (value, option)
 * @param {Array} options - Array of option objects with { value, label }
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Disable the select
 * @param {string} label - Optional label text
 * @param {boolean} required - Mark as required field
 * @param {string} error - Error message to display
 * @param {string} name - Form field name
 */
export function Select({
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option...",
  disabled = false,
  label,
  required = false,
  error,
  name
}) {
  const handleChange = (e) => {
    const selectedValue = e.target.value;
    const selectedOption = options.find(opt => opt.value === selectedValue);
    
    if (onChange) {
      onChange(selectedValue, selectedOption);
    }
  };

  const selectId = React.useId();
  const errorId = React.useId();

  return (
    <div className="hwc-select-wrapper">
      {label && (
        <label htmlFor={selectId} className="hwc-select-label">
          {label}
          {required && <span className="hwc-select-required" aria-label="required">*</span>}
        </label>
      )}
      
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        className={`hwc-select ${error ? "hwc-select-error" : ""}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <div id={errorId} className="hwc-select-error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default Select;
