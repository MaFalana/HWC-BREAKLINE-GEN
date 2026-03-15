# Changelog

## Recent Updates

### Free Satellite Imagery (No API Key Required)
- **Changed**: Both 2D and 3D modes now use free ESRI World Imagery by default
- **Removed**: MapTiler API key requirement (still supported but optional)
- **Benefit**: Unlimited, high-quality satellite imagery at no cost
- **Layers Available**:
  - Streets: OpenStreetMap (free)
  - Satellite: ESRI World Imagery (free, up to zoom 19)

### Image-Based Ortho Overlays
- **Added**: `ImageOrthoLayer` component for @hwc/map
- **Purpose**: Simple JPG/PNG image overlays for 2D maps
- **Features**:
  - Much faster than GeoTIFF approach
  - Explicit bounds or auto-calculate from point cloud
  - Optional - only loads if ortho data provided
  - Adjustable opacity with slider control (0-100%)
  - Reset view button fits to ortho bounds when present
- **Usage**:
  ```jsx
  <ImageOrthoLayer 
    url="https://cdn.com/ortho.jpg"
    bounds={[[south, west], [north, east]]}
    opacity={0.9}
    onLoad={(data) => console.log('Loaded:', data)}
  />
  ```

### Custom Dropdown Components
- **Added**: Custom Select component for Potree panel
- **Fixed**: White-on-white visibility issues on Windows
- **Features**:
  - Consistent styling across all platforms
  - Keyboard navigation (Arrow keys, Enter, Escape)
  - Smooth animations and transitions
  - HWC red accent for selected items
  - Checkmarks for selected options
- **Replaced**: All native `<select>` elements in panel

### Attribution Updates
- **Changed**: Dynamic attribution based on active layer
- **Format**: Consistent between 2D and 3D modes
- **Shows**:
  - HWC Engineering copyright
  - Layer provider (ESRI or OpenStreetMap)
  - Potree & Cesium credits (3D mode only)

### Bug Fixes
- **Fixed**: Potree cleanup error (`removePointCloud` not a function)
- **Fixed**: Layer toggle not working in 2D mode
- **Fixed**: Control spacing in bottom-right corner
- **Fixed**: Reset view button animation

### UI Improvements
- **Removed**: Map marker in 2D viewer mode (cleaner view)
- **Improved**: Equal vertical spacing between control groups
- **Enhanced**: Dropdown visibility and aesthetics

## Package Updates

### @hwc/map
- Added `ImageOrthoLayer` component
- Updated to use free ESRI satellite imagery
- Dynamic attribution based on layer
- Removed MapTiler dependency

### @hwc/potree
- Added custom Select component
- Updated to use free ESRI satellite imagery
- Dynamic attribution based on layer
- Fixed cleanup and layer toggle issues
- Improved panel UI consistency

## Migration Notes

### No Breaking Changes
All changes are backwards compatible. Existing code will continue to work.

### Optional Improvements
1. **Remove MapTiler Key**: No longer needed for satellite imagery
2. **Use ImageOrthoLayer**: For faster ortho loading in 2D mode
3. **Update Attribution**: Automatically shows correct credits

### Before:
```jsx
<HwcMap
  baseLayer="satellite"
  mapTilerKey={import.meta.env.PUBLIC_MAPTILER_API_KEY}
/>
```

### After (MapTiler key optional):
```jsx
<HwcMap
  baseLayer="satellite"  // Uses free ESRI imagery
/>
```
