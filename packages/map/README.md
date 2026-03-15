# @hwc/map

## Description
Reusable, opinionated Leaflet map component for HWC web applications.
This package provides a map rendering primitive, not an application feature.
It is designed to be shared across multiple HWC projects (Cloud Viewer, Photo Map Log, future tools) without leaking project-specific assumptions.

### What The Package Is
- A **React-based Leaflet map** meant to be consumed as an Astro React island
- A consistent implementation of:
- base map layers (streets / satellite) 
- markers and clustering
- zoom + fit controls
- attribution
- A stable abstraction over “things with coordinates” (items)

### What this package is *not*
This package intentionally does *not*:
- fetch data
- manage routing or navigation
- own layout (side panels, headers, drawers)
- depend on Cloud Viewer or Photo Map Log APIs
- read environment variables internally
Those concerns belong to the consuming app.

### Design goals
1. Reusability across projects
The same map component should work for:
    - point clouds
    - photos
    - inspections
    - assets
    - any other spatial items
2. Explicit boundaries
All project-specific behavior is injected via props and callbacks.
3. Low refactor cost
Projects can change data models without rewriting the map.
4. Predictable behavior
No hidden side effects, no implicit navigation, no global state.

### Package structure

```arduino
packages/map/
  src/
    main.jsx         # map container + composition root
    controls.jsx     # zoom, base-layer toggle, fit-to-all
    attribution.jsx  # attribution footer
    map.css          # leaflet + HWC map styles
    index.js         # public exports
  package.json
  README.md
```
Each file has a single responsibility.
No “utils” files and no app-relative imports.

### Installation (monorepo)
This package is intended to be used via npm workspaces.
From the monorepo root:
```bash
npm install
```

### Required peer dependencies (in the consuming app)
```@hwc/map``` declares peer dependencies to avoid duplicate React or Leaflet instances.
The consuming app must provide:
```bash
npm install react react-dom leaflet react-leaflet react-leaflet-cluster
```
If using Astro:
```bash
npx astro add react
```

### Basic usage (Astro)
```astro
---
import { HwcMap } from "@hwc/map";

const items = [
  { id: "a", lat: 38.0, lon: -87.5, name: "Item A" },
  { id: "b", lat: 38.02, lon: -87.52, name: "Item B" }
];
---

<div style="height: 70vh;">
  <HwcMap
    client:only="react"
    items={items}
  />
</div>
```

## Ortho Overlays

### GeoTIFF/COG Overlay

Add ortho imagery overlay with embedded georeferencing:

```astro
---
import { HwcMap, OrthoLayer } from "@hwc/map";
---

<HwcMap client:only="react" items={items}>
  <OrthoLayer 
    url="https://cdn.com/ortho.tif"
    opacity={0.9}
    onLoad={(georaster) => console.log('Loaded!', georaster)}
    onError={(error) => console.error('Error:', error)}
  />
</HwcMap>
```

The OrthoLayer component:
- Loads GeoTIFF/COG files with embedded georeferencing
- Automatically fits map bounds to ortho extent
- Supports RGB imagery
- Requires proj4 for coordinate transformation (loaded from Potree if available)

### Simple Image Overlay

For faster loading and smaller file sizes, use JPG/PNG images with explicit bounds:

```astro
---
import { HwcMap, ImageOrthoLayer } from "@hwc/map";
---

<HwcMap client:only="react" items={items}>
  <ImageOrthoLayer 
    url="https://cdn.com/ortho.jpg"
    bounds={[[38.0, -87.5], [38.02, -87.48]]} // [[south, west], [north, east]]
    opacity={0.9}
  />
</HwcMap>
```

**Auto-calculate bounds from point cloud:**

```jsx
<ImageOrthoLayer 
  url={project.ortho.url}
  pointCloudBounds={project.cloud.bounds}
  crs={project.crs}
  opacity={0.9}
/>
```

The ImageOrthoLayer component:
- Much faster and simpler than GeoTIFF approach
- Supports JPG/PNG images
- Can auto-calculate bounds from point cloud using proj4
- Optional - only loads if ortho data is provided

### The items contract
The map renders items, not “projects”, “photos”, or “jobs”.
By default, an item is expected to look like:
```js
{
  id: string,
  lat: number,
  lon: number,
  name?: string
}
```

Cloud Viewer–style shapes are supported out of the box:
```js
{
  _id: "...",
  location: { lat: 38.0, lon: -87.5 }
}
```

### Adapting to different data models
If your data does not match the default shape, pass adapter functions:
```jsx
<HwcMap
  items={records}
  getId={(r) => r.uuid}
  getLatLng={(r) => [r.y, r.x]}
  getLabel={(r) => r.title}
/>
```
This avoids rewriting map logic when data models change.

### Interaction callbacks

The map never navigates or mutates app state directly.
Instead, it emits signals:
- ```onSelect(id, item)```
Called when a marker is clicked.
- ```onHover(id | null, item)```
Called on marker hover in/out.
- ```targetItem```
When set, the map pans to that item.

Example:

```jsx
<HwcMap
  items={items}
  onSelect={(id, item) => setSelectedId(id)}
  highlightedId={hoveredId}
  targetItem={focusedItem}
/>
```

## Base Layers

Two free base layers are available (no API key required):

### Streets (OpenStreetMap)
- **Provider**: OpenStreetMap
- **Cost**: Free, unlimited
- **Coverage**: Global
- **Best for**: Street maps with labels

### Satellite (ESRI World Imagery)
- **Provider**: ESRI/Maxar
- **Cost**: Free, unlimited (no API key needed)
- **Quality**: High resolution (up to zoom 19)
- **Coverage**: Global
- **Best for**: Satellite imagery

```jsx
<HwcMap
  items={items}
  baseLayer="satellite"  // or "streets"
/>
```

The map automatically uses free ESRI satellite imagery - no MapTiler key needed!

## Clustering
Marker clustering is enabled by default.
```jsx
<HwcMap
  items={items}
  cluster={true}
/>
```

Disable clustering if needed:
```jsx
<HwcMap
  items={items}
  cluster={false}
/>
```

## Styling and theming
The map imports its own CSS.
You can override brand colors using CSS variables in the consuming app:

```css
:root {
  --hwc-red: #EE2F27;
  --hdr-bg: rgba(41, 44, 48, 0.85);
  --hdr-fg: #ffffff;
}
```
Layout styling (side panels, headers) is intentionally outside this package.

## Testing and Vallidation
This package does not have a separate build step.
The **authoritative test** is whether a consuming app can build.

### Local smoke test
From the monorepo root:

```bash
npm install
npm --workspace=@hwc/web run build
```
If the web app builds successfully, then:
- workspace resolution is correct
- JSX transpilation works
- Leaflet dependencies are compatible
- package exports are valid

### Dedicated test page (recommended)
Create a simple page in the consuming app:

```astro
---
import { HwcMap } from "@hwc/map";

const items = [
  { id: "test", lat: 0, lng: 0, label: "Test" }
];
---

<div style="height: 80vh;">
  <HwcMap client:only="react" items={items} />
</div>
```

This validates runtime behavior during development.

### CI Validation
In CI, the recommended check is:
```yaml
- run: npm ci
- run: npm --workspace=@hwc/web run build
```
No separate test harness is required.

### Extension guidelines
If you need new functionality:
- Prefer *new props* over modifying internal behavior
- Avoid app-specific logic inside the package
- Keep the public API small and explicit
Examples of acceptable extensions:
    - optional GeoJSON overlay
    - additional base layer options
    - marker rendering overrides
Examples of unacceptable extensions:
    - API polling
    - route navigation
    - side panel UI

### Related packages
- ```@hwc/shell``` (layout + header + sidebar)
- ```@hwc/assets``` (shared icons and branding)
These are intentionally separate to keep responsibilities clear.