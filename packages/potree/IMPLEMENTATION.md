# @hwc/potree Implementation Summary

## Package Structure

```
packages/potree/
├── package.json              # Package config with peer deps
├── README.md                 # Comprehensive documentation
├── IMPLEMENTATION.md         # This file
└── src/
    ├── index.js              # Public exports
    ├── main.jsx              # HwcPotree component (refactored from Viewer3D)
    ├── controls.jsx          # PotreeControls component (refactored from ViewerControls)
    ├── potree.css            # Viewer styles
    ├── hooks/
    │   ├── usePotreeLoader.jsx   # Dynamic Potree 1.8.2 script loader
    │   └── useCesiumLoader.jsx   # Dynamic Cesium 1.39 script loader
    └── panel/                # Potree tools panel
        ├── PotreePanel.jsx   # Main panel (now uses @hwc/panel)
        ├── ToolsSection.jsx  # Measurement tools
        ├── AppearanceSection.jsx  # Point cloud appearance controls
        ├── CameraSection.jsx # Camera controls
        ├── SceneSection.jsx  # Scene management
        ├── ExportSection.jsx # Export/screenshot tools
        ├── panel.css         # Potree-specific panel styles
        └── index.js          # Panel exports
```

## Key Refactoring Changes

### 1. Removed App-Specific Logic

**Before (in original viewer):**
- Fetched project data from API
- Managed routing/navigation
- Included header component
- Read environment variables directly

**After (in @hwc/potree):**
- All data passed via props
- No API calls
- No navigation logic
- Environment variables injected from app

### 2. Clean Component Interface

**HwcPotree Props:**
```jsx
<HwcPotree
  pointCloudUrl="https://cdn.com/project/metadata.json"
  name="Project Name"
  location={{ lat: 40.0, lon: -86.0, z: 800 }}
  crs={{ proj4: '+proj=...' }}
  baseLayer="satellite"
  mapTilerKey={apiKey}
  onViewerReady={(viewers) => {}}
/>
```

### 3. Reusable Exports

```javascript
// Main viewer
export { HwcPotree } from './main.jsx';

// Controls
export { PotreeControls } from './controls.jsx';

// Panel with tools
export { PotreePanel } from './panel/PotreePanel.jsx';

// Hooks for custom implementations
export { usePotreeLoader } from './hooks/usePotreeLoader.jsx';
export { useCesiumLoader } from './hooks/useCesiumLoader.jsx';
```

### 4. Panel Integration with @hwc/panel

**Before:**
- Custom panel implementation
- Duplicate styles
- Manual toggle/collapse logic

**After:**
- Uses `@hwc/panel` as base
- Extends with Potree-specific controls
- Inherits position prop (left/right)
- Consistent with other HWC packages

## Dependencies

### Peer Dependencies
- `@hwc/panel` - Base panel component
- `react` & `react-dom` - React framework
- `react-icons` - Icon library
- `leaflet` & `react-leaflet` - For 2D ortho overlay support

### Direct Dependencies
- `georaster` - GeoTIFF parsing
- `georaster-layer-for-leaflet` - Ortho overlay rendering

### External Dependencies (loaded dynamically)
- Potree 1.8.2 (from `/potree/1.8.2/`)
- Cesium 1.39 (bundled with Potree)
- Three.js (bundled with Potree)
- proj4 (for coordinate transformation)

## Usage in Apps

### Basic Usage

```astro
---
import { HwcHeader } from '@hwc/header';
import { HwcPotree, PotreeControls, PotreePanel } from '@hwc/potree';
---

<HwcHeader title={project.name} />

<div style="height: calc(100vh - var(--header-h));">
  <HwcPotree
    client:only="react"
    pointCloudUrl={project.cloud.url}
    name={project.name}
    location={project.location}
    crs={project.crs}
    baseLayer="satellite"
    mapTilerKey={import.meta.env.PUBLIC_MAPTILER_API_KEY}
    onViewerReady={(viewers) => console.log('Ready!', viewers)}
  />
  
  <PotreeControls client:only="react" {...viewers} />
  <PotreePanel client:only="react" {...viewers} isOpen={true} />
</div>
```

### With State Management

```jsx
function PointCloudApp({ project }) {
  const [viewers, setViewers] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [baseLayer, setBaseLayer] = useState('satellite');

  return (
    <>
      <HwcPotree
        pointCloudUrl={project.cloud.url}
        name={project.name}
        location={project.location}
        crs={project.crs}
        baseLayer={baseLayer}
        mapTilerKey={mapTilerKey}
        onViewerReady={setViewers}
      />
      
      {viewers && (
        <>
          <PotreeControls {...viewers} />
          <PotreePanel
            {...viewers}
            isOpen={isPanelOpen}
            onToggle={() => setIsPanelOpen(!isPanelOpen)}
            position="left"
          />
        </>
      )}
    </>
  );
}
```

## Coordinate System Handling

The package handles transformation between:
- **Point Cloud CRS**: State Plane or other projected coordinate system (feet/meters)
- **Cesium Globe**: WGS84 (EPSG:4326) in degrees

### Required Props

```jsx
location={{
  lat: 40.0,      // WGS84 latitude (degrees)
  lon: -86.0,     // WGS84 longitude (degrees)
  z: 800          // Ground elevation (feet)
}}

crs={{
  proj4: '+proj=tmerc +lat_0=... +lon_0=... +datum=NAD83 +units=us-ft +no_defs'
}}
```

The proj4 string is used to transform State Plane coordinates to WGS84 for camera synchronization.

## Features

### Viewer Features
- ✅ Potree 1.8.2 point cloud rendering
- ✅ Cesium 1.39 base layer (satellite/streets)
- ✅ Camera synchronization (Potree ↔ Cesium)
- ✅ Coordinate transformation (proj4)
- ✅ Transparent Potree overlay on Cesium
- ✅ Earth controls for navigation
- ✅ EDL (Eye-Dome Lighting) enabled
- ✅ Configurable point budget

### Panel Features
- ✅ Measurement tools (distance, area, height, angle, etc.)
- ✅ Appearance controls (point size, color mode, opacity)
- ✅ Camera controls (FOV, position)
- ✅ Scene management (point cloud visibility)
- ✅ Export tools (screenshots, measurements)
- ✅ Collapsible sections
- ✅ Position prop (left/right)

### Control Features
- ✅ Zoom in/out
- ✅ Reset view
- ✅ Works with both Potree and Cesium

## Testing

Test page created at: `apps/web/src/pages/potree-test.astro`

To test:
1. Ensure Potree 1.8.2 is in `apps/web/public/potree/1.8.2/`
2. Set `PUBLIC_MAPTILER_API_KEY` in `.env`
3. Run `npm run dev:web`
4. Navigate to `/potree-test`

## Next Steps

1. **Test with real point cloud data**
2. **Add ortho overlay support** (already scaffolded)
3. **Document measurement export formats**
4. **Add volume calculation tools**
5. **Create more usage examples**
6. **Add TypeScript definitions** (optional)

## Design Principles Followed

✅ **Reusability** - Works across any HWC project with point clouds
✅ **Clear boundaries** - No app-specific logic
✅ **Explicit dependencies** - All data injected via props
✅ **Consistent API** - Follows @hwc/map and @hwc/panel patterns
✅ **Low refactor cost** - Apps control data fetching and state
✅ **Predictable behavior** - No hidden side effects or global state
