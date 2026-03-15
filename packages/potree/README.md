# @hwc/potree

Potree 1.8.2 point cloud viewer with Cesium integration for HWC applications.

## Features

- **3D Point Cloud Viewing**: Potree 1.8.2 with Cesium 1.39 integration
- **Free Satellite Imagery**: ESRI World Imagery (no API key required)
- **Coordinate Transformation**: proj4 support for State Plane and other CRS
- **Advanced Controls**:
  - Classification filters (18 LAS classification types)
  - Elevation range sliders
  - Intensity range sliders
  - Point size, shape, and display mode controls
  - Eye-Dome Lighting (EDL)
  - Point budget (quality) settings
- **Custom UI Components**: Polished dropdowns that work consistently across all platforms
- **Camera Controls**: Zoom, reset view, synchronized with Cesium
- **Base Layer Toggle**: Switch between streets and satellite imagery

### What The Package Is

- A **React-based Potree wrapper** for rendering point clouds
- Cesium integration for geospatial context (satellite/street imagery)
- Camera synchronization between Potree and Cesium using proj4
- 3D-specific controls (zoom, reset view)
- Optional tools panel for point cloud manipulation

### What this package is *not*

This package intentionally does *not*:
- Fetch project data or point clouds
- Manage application routing
- Own layout (headers, sidebars)
- Read environment variables internally

Those concerns belong to the consuming app.

## Installation

This package is designed for use in HWC monorepo workspaces:

```bash
npm install  # from monorepo root
```

## Required peer dependencies

```bash
npm install react react-dom react-icons leaflet react-leaflet
```

## Required static assets

This package requires Potree 1.8.2 to be available at `/potree/1.8.2/` in your app's public directory.

Download Potree 1.8.2 from: https://github.com/potree/potree/releases/tag/1.8.2

Extract to: `apps/your-app/public/potree/1.8.2/`

## Basic Usage

```jsx
import { HwcPotree } from '@hwc/potree';

function PointCloudViewer({ project }) {
  return (
    <div style={{ height: '100vh' }}>
      <HwcPotree
        pointCloudUrl={`https://your-cdn.com/${project.id}/metadata.json`}
        name={project.name}
        location={{
          lat: project.location.lat,
          lon: project.location.lon,
          z: project.location.z
        }}
        crs={{
          proj4: project.crs.proj4  // State Plane or other CRS
        }}
        baseLayer="satellite"  // Free ESRI satellite imagery
        onViewerReady={(viewers) => {
          console.log('Viewers ready:', viewers);
        }}
      />
    </div>
  );
}
```

**Note**: No MapTiler API key needed - uses free ESRI World Imagery by default!

## API Reference

### HwcPotree

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pointCloudUrl` | `string` | - | URL to point cloud metadata.json |
| `name` | `string` | `"Point Cloud"` | Display name for the point cloud |
| `location` | `object` | - | WGS84 location `{ lat, lon, z }` |
| `crs` | `object` | - | Coordinate reference system with `proj4` string |
| `baseLayer` | `string` | `"satellite"` | Base layer: `"streets"` or `"satellite"` (both free) |
| `mapTilerKey` | `string` | - | Optional MapTiler API key (not needed for default layers) |
| `onViewerReady` | `function` | - | Callback when viewers are initialized |
| `orthoUrl` | `string` | - | Optional ortho COG URL for overlay |

### PotreeControls

Zoom controls for the 3D viewer:

```jsx
import { PotreeControls } from '@hwc/potree';

<PotreeControls
  potreeViewer={potreeViewer}
  cesiumViewer={cesiumViewer}
/>
```

### NavigationCube

3D orientation helper with clickable faces for quick camera navigation:

```jsx
import { NavigationCube } from '@hwc/potree';

<NavigationCube
  potreeViewer={potreeViewer}
  cesiumViewer={cesiumViewer}
/>
```

The navigation cube:
- Displays in the top-right corner
- Rotates in sync with the main camera to show current orientation
- Click faces to animate camera to standard views (Top, Bottom, N, S, E, W)
- Hover effects highlight clickable faces
- Smooth camera transitions with ease-in-out animation

### PotreePanel

Tools panel with measurement, appearance, camera, scene, and export controls:

```jsx
import { PotreePanel } from '@hwc/potree';

<PotreePanel
  potreeViewer={potreeViewer}
  cesiumViewer={cesiumViewer}
  isOpen={isPanelOpen}
  onToggle={() => setIsPanelOpen(!isPanelOpen)}
/>
```

## Coordinate Systems

The viewer handles coordinate transformation between:
- **Point cloud**: State Plane or other projected CRS (in feet or meters)
- **Cesium globe**: WGS84 (EPSG:4326) in degrees

Transformation is done using proj4. You must provide the proj4 string for your point cloud's CRS:

```jsx
<HwcPotree
  crs={{
    proj4: '+proj=tmerc +lat_0=... +lon_0=... +k=... +x_0=... +y_0=... +datum=NAD83 +units=us-ft +no_defs'
  }}
  location={{
    lat: 40.0,  // WGS84 latitude
    lon: -86.0, // WGS84 longitude
    z: 800      // Ground elevation in feet
  }}
/>
```

## Integration with Astro

```astro
---
import { HwcPotree } from '@hwc/potree';
---

<div style="height: 100vh;">
  <HwcPotree
    client:only="react"
    pointCloudUrl={pointCloudUrl}
    name={project.name}
    location={project.location}
    crs={project.crs}
    baseLayer="satellite"
    mapTilerKey={import.meta.env.PUBLIC_MAPTILER_API_KEY}
  />
</div>
```

## Using with other HWC packages

```astro
---
import { HwcHeader } from '@hwc/header';
import { HwcPotree, PotreeControls, NavigationCube, PotreePanel } from '@hwc/potree';
---

<HwcHeader title={project.name} />

<div style="height: calc(100vh - var(--header-h));">
  <HwcPotree {...potreeProps} client:only="react" />
  <PotreeControls {...controlProps} client:only="react" />
  <NavigationCube {...cubeProps} client:only="react" />
  <PotreePanel {...panelProps} client:only="react" />
</div>
```

## Custom UI Components

The panel uses custom-styled dropdown components that work consistently across all platforms (Mac, Windows, Linux):

- **Custom Select Dropdowns**: Fully styled with keyboard navigation, smooth animations, and HWC branding
- **No Platform Issues**: Fixes white-on-white visibility issues on Windows
- **Accessible**: Proper ARIA attributes and keyboard support (Arrow keys, Enter, Escape)
- **Visual Feedback**: Hover states, selected indicators, and smooth transitions

## Styling

The viewer uses CSS variables for theming:

```css
:root {
  --hwc-red: #EE2F27;
  --hdr-bg: rgba(41, 44, 48, 0.95);
  --hdr-fg: #ffffff;
  --hdr-border: rgba(255, 255, 255, 0.1);
  --accent: #EE2F27;
  --header-h: 60px;
}
```

## Performance

- Default point budget: 2,000,000 points
- EDL (Eye-Dome Lighting) enabled by default
- Transparent Potree renderer overlays Cesium globe
- Synchronized render loop for smooth camera movement

## Browser Support

- Modern browsers with WebGL support
- Tested with Chrome, Firefox, Safari, Edge
- Mobile support (touch controls work but performance may vary)

## Troubleshooting

**Point cloud not loading:**
- Check that metadata.json is accessible
- Verify CORS headers on your CDN
- Check browser console for errors

**Camera sync issues:**
- Verify proj4 string is correct for your CRS
- Check that location.z (ground elevation) is accurate
- Ensure point cloud coordinates are in expected units (feet/meters)

**Performance issues:**
- Reduce point budget: `potreeViewer.setPointBudget(1_000_000)`
- Disable EDL: `potreeViewer.setEDLEnabled(false)`
- Use lower resolution point clouds for web viewing

## Version

This package is built for **Potree 1.8.2** and **Cesium 1.39** (bundled with Potree).
