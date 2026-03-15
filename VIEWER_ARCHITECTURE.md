# HWC Viewer Architecture

## Package Separation: 2D vs 3D

### Design Decision

We've separated 2D and 3D viewing into distinct packages:

- **@hwc/map** - 2D Leaflet-based mapping (with optional ortho overlay)
- **@hwc/potree** - 3D Potree point cloud viewer with Cesium base layer

### Why Separate?

1. **Dependency Weight**
   - @hwc/map: ~150KB (Leaflet)
   - @hwc/potree: Several MBs (Potree + Cesium + Three.js)
   - Apps that only need 2D don't load 3D libraries

2. **Different Use Cases**
   - 2D: Photos, inspections, general spatial data, ortho imagery
   - 3D: Point clouds, LiDAR data, 3D models

3. **Clear Boundaries**
   - Each package has one responsibility
   - Easier to maintain and version independently

4. **Reusability**
   - Photo app: uses @hwc/map only
   - Point cloud app: uses both packages
   - Dashboard: uses @hwc/map for overview

## Package Overview

### @hwc/map (2D Viewer)

**Purpose:** Leaflet-based 2D mapping with markers, clustering, and ortho overlay

**Features:**
- ✅ Marker rendering with clustering
- ✅ Base layers (streets/satellite)
- ✅ Zoom and layer controls
- ✅ Ortho imagery overlay (GeoTIFF/COG)
- ✅ Responsive (desktop/mobile)
- ✅ Adapter pattern for different data shapes

**Exports:**
```javascript
import { HwcMap, OrthoLayer } from '@hwc/map';
```

**Dependencies:**
- leaflet
- react-leaflet
- react-leaflet-cluster
- georaster (for ortho)
- georaster-layer-for-leaflet (for ortho)

### @hwc/potree (3D Viewer)

**Purpose:** Potree 1.8.2 point cloud viewer with Cesium base layer

**Features:**
- ✅ Point cloud rendering (Potree 1.8.2)
- ✅ Cesium base layer (satellite/streets)
- ✅ Camera synchronization (Potree ↔ Cesium)
- ✅ Coordinate transformation (proj4)
- ✅ Measurement tools (distance, area, height, etc.)
- ✅ Appearance controls (point size, color mode, EDL)
- ✅ Camera and scene management
- ✅ Export tools (screenshots, measurements)

**Exports:**
```javascript
import { 
  HwcPotree,           // Main 3D viewer
  PotreeControls,      // Zoom controls
  PotreePanel,         // Tools panel
  usePotreeLoader,     // Hook for custom implementations
  useCesiumLoader      // Hook for custom implementations
} from '@hwc/potree';
```

**Dependencies:**
- @hwc/panel (for tools panel)
- react, react-dom, react-icons
- leaflet, react-leaflet (for ortho overlay support)
- georaster (for ortho)
- Potree 1.8.2 (loaded dynamically from /potree/1.8.2/)
- Cesium 1.39 (bundled with Potree)

## Usage Patterns

### Pattern 1: 2D Only (Photos, Inspections)

```astro
---
import { HwcMap } from '@hwc/map';
---

<HwcMap
  client:only="react"
  items={photos}
  onSelect={(id) => showPhotoDetail(id)}
/>
```

### Pattern 2: 2D with Ortho Overlay

```astro
---
import { HwcMap, OrthoLayer } from '@hwc/map';
---

<HwcMap client:only="react" items={items}>
  <OrthoLayer url={project.ortho.url} opacity={0.9} />
</HwcMap>
```

### Pattern 3: 3D Only (Point Cloud Viewer)

```astro
---
import { HwcPotree, PotreeControls, PotreePanel } from '@hwc/potree';
---

<HwcPotree
  client:only="react"
  pointCloudUrl={project.cloud.url}
  location={project.location}
  crs={project.crs}
  baseLayer="satellite"
  mapTilerKey={apiKey}
  onViewerReady={(viewers) => setViewers(viewers)}
/>

<PotreeControls client:only="react" {...viewers} />
<PotreePanel client:only="react" {...viewers} isOpen={true} />
```

### Pattern 4: 2D/3D Mode Switching (Full Viewer)

```jsx
function ViewerApp({ project }) {
  const [mode, setMode] = useState('3d');
  const [viewers, setViewers] = useState(null);

  return (
    <>
      {/* Mode Toggle */}
      <ModeToggle mode={mode} onModeChange={setMode} />

      {/* 2D Mode */}
      {mode === '2d' && (
        <HwcMap
          items={[{ 
            id: project._id, 
            lat: project.location.lat, 
            lon: project.location.lon 
          }]}
          initialCenter={[project.location.lat, project.location.lon]}
          initialZoom={18}
        >
          {project.ortho && (
            <OrthoLayer url={project.ortho.url} />
          )}
        </HwcMap>
      )}

      {/* 3D Mode */}
      {mode === '3d' && (
        <>
          <HwcPotree
            pointCloudUrl={project.cloud.url}
            location={project.location}
            crs={project.crs}
            onViewerReady={setViewers}
          />
          {viewers && (
            <>
              <PotreeControls {...viewers} />
              <PotreePanel {...viewers} isOpen={true} />
            </>
          )}
        </>
      )}
    </>
  );
}
```

## Data Flow

### App Responsibilities
- Fetch project data from API
- Manage routing and navigation
- Handle authentication
- Manage global state (mode, selected items, etc.)
- Provide environment variables (API keys)

### Package Responsibilities
- Render visualization (2D map or 3D point cloud)
- Handle user interactions (zoom, pan, select)
- Manage viewer-specific state (camera, appearance)
- Emit events to app (onSelect, onHover, onViewerReady)

## Coordinate Systems

### 2D (@hwc/map)
- **Input**: WGS84 (lat/lon in degrees)
- **Display**: Web Mercator (EPSG:3857)
- **Ortho**: Any CRS with embedded georeferencing

### 3D (@hwc/potree)
- **Point Cloud**: State Plane or other projected CRS (feet/meters)
- **Cesium Globe**: WGS84 (EPSG:4326) in degrees
- **Transformation**: proj4 (State Plane → WGS84)

## File Structure

```
packages/
├── map/                      # 2D viewer
│   ├── src/
│   │   ├── index.js
│   │   ├── main.jsx          # HwcMap component
│   │   ├── controls.jsx      # Zoom/layer controls
│   │   ├── attribution.jsx   # Attribution footer
│   │   ├── ortho-layer.jsx   # Ortho overlay
│   │   └── map.css
│   ├── package.json
│   └── README.md
│
├── potree/                   # 3D viewer
│   ├── src/
│   │   ├── index.js
│   │   ├── main.jsx          # HwcPotree component
│   │   ├── controls.jsx      # 3D zoom controls
│   │   ├── potree.css
│   │   ├── hooks/
│   │   │   ├── usePotreeLoader.jsx
│   │   │   └── useCesiumLoader.jsx
│   │   └── panel/            # Tools panel
│   │       ├── PotreePanel.jsx
│   │       ├── ToolsSection.jsx
│   │       ├── AppearanceSection.jsx
│   │       ├── CameraSection.jsx
│   │       ├── SceneSection.jsx
│   │       ├── ExportSection.jsx
│   │       └── panel.css
│   ├── package.json
│   ├── README.md
│   └── IMPLEMENTATION.md
│
└── panel/                    # Base panel component
    ├── src/
    │   ├── index.js
    │   ├── main.jsx          # HwcPanel
    │   ├── section.jsx       # PanelSection
    │   └── panel.css
    ├── package.json
    └── README.md
```

## Example Apps

### apps/web/src/pages/

1. **map-test.astro** - Basic 2D map test
2. **map-with-ortho.astro** - 2D map with ortho overlay
3. **potree-test.astro** - Basic 3D point cloud test
4. **viewer-example.astro** - Full 2D/3D mode switching

## Installation

```bash
# From monorepo root
npm install

# Packages are linked via workspaces
# No need to install packages individually
```

## Required Static Assets

### For @hwc/potree
Download Potree 1.8.2 and place in `apps/your-app/public/potree/1.8.2/`

Download from: https://github.com/potree/potree/releases/tag/1.8.2

### For @hwc/map (ortho support)
Requires proj4 for coordinate transformation. If using with @hwc/potree, proj4 is already loaded. Otherwise, include:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js"></script>
```

## Environment Variables

```env
# MapTiler API key for satellite imagery
PUBLIC_MAPTILER_API_KEY=your_key_here
```

## Next Steps

1. Test with real point cloud data
2. Add more measurement tools
3. Add volume calculation
4. Add profile/cross-section tools
5. Add annotation/markup tools
6. Add comparison mode (before/after)
7. Add VR/AR support (future)

## Design Principles

✅ **Separation of Concerns** - 2D and 3D are separate packages
✅ **Reusability** - Each package works across multiple apps
✅ **Clear Boundaries** - No app-specific logic in packages
✅ **Explicit Dependencies** - All data injected via props
✅ **Consistent API** - Similar patterns across packages
✅ **Low Refactor Cost** - Apps control data and state
✅ **Predictable Behavior** - No hidden side effects
