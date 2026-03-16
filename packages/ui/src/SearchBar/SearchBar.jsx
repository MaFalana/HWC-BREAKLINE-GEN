import { IoSearch } from "react-icons/io5";
import { FaFilter } from 'react-icons/fa6';
import { useState, useRef, useEffect } from 'react';
import './search-bar.css';

export function SearchBar({ 
  placeholder = "Search...",
  onSearch,
  showFilter = false,
  filterContent,
  hasActiveFilters = false
}) {
  const [searchValue, setSearchValue] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterDropdown]);

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    // Call onSearch on every change - parent handles debouncing
    onSearch?.(value, false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Trigger immediate search on Enter key (bypass debounce)
    onSearch?.(searchValue, true);
  };

  return (
    <div className="hwc-search-wrapper" ref={filterRef}>
      <form onSubmit={handleSubmit} className="hwc-search">
        <IoSearch className="hwc-search__icon" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleChange}
          className="hwc-search__input"
        />
        {showFilter && (
          <button
            type="button"
            className={`hwc-search__filter-btn ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            aria-label="Filter options"
          >
            <FaFilter />
            {hasActiveFilters && <span className="hwc-search__filter-badge" />}
          </button>
        )}
      </form>

      {showFilter && showFilterDropdown && filterContent && (
        <div className="hwc-search__filter-dropdown">
          {filterContent}
        </div>
      )}
    </div>
  );
}
