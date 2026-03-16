import React from "react";
import "./county-select.css";

/**
 * County Select Component
 * 
 * Dropdown for selecting Indiana counties.
 * Designed to sync with map polygon selection.
 * 
 * @param {string} value - Currently selected county name
 * @param {Function} onChange - Callback when selection changes (countyName, countyData)
 * @param {Array} counties - Array of county objects with { county, url }
 * @param {string} placeholder - Placeholder text (default: "Select a county...")
 * @param {boolean} disabled - Disable the select
 * @param {string} label - Optional label text
 * @param {boolean} required - Mark as required field
 * @param {string} error - Error message to display
 */
export function CountySelect({
  value = "",
  onChange,
  counties = [],
  placeholder = "Select a county...",
  disabled = false,
  label,
  required = false,
  error
}) {
  const handleChange = (e) => {
    const selectedCounty = e.target.value;
    const countyData = counties.find(c => c.county === selectedCounty);
    
    if (onChange) {
      onChange(selectedCounty, countyData);
    }
  };

  const selectId = React.useId();
  const errorId = React.useId();

  return (
    <div className="county-select-wrapper">
      {label && (
        <label htmlFor={selectId} className="county-select-label">
          {label}
          {required && <span className="county-select-required" aria-label="required">*</span>}
        </label>
      )}
      
      <select
        id={selectId}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        className={`county-select ${error ? "county-select-error" : ""}`}
      >
        <option value="">{placeholder}</option>
        {counties.map((county) => (
          <option key={county.county} value={county.county}>
            {county.county} County
          </option>
        ))}
      </select>

      {error && (
        <div id={errorId} className="county-select-error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default CountySelect;
