# @hwc/potree Features

## Enhanced Appearance Controls

### Classification Filters
When viewing point clouds in **CLASSIFICATION** mode, you can now toggle individual LAS classification types on/off:

- **Never Classified** (0) - Gray
- **Unclassified** (1) - Gray
- **Ground** (2) - Brown
- **Low Vegetation** (3) - Bright Green
- **Medium Vegetation** (4) - Green
- **High Vegetation** (5) - Dark Green
- **Building** (6) - Orange
- **Low Point (Noise)** (7) - Magenta
- **Water** (9) - Blue
- **Rail** (10) - Light Blue
- **Road Surface** (11) - Dark Gray
- **Wire - Guard** (13) - Black
- **Wire - Conductor** (14) - Cyan
- **Transmission Tower** (15) - Dark Cyan
- **Wire - Connector** (16) - Green
- **Bridge Deck** (17) - Brown
- **High Noise** (18) - Magenta

Each classification shows a color swatch and can be toggled with a checkbox. This allows you to filter the point cloud to show only specific features (e.g., only buildings and ground).

### Elevation Range Sliders
When viewing point clouds in **ELEVATION** mode, you can adjust the elevation range to focus on specific height ranges:

- **Min Elevation Slider** - Sets the minimum elevation value for the color gradient
- **Max Elevation Slider** - Sets the maximum elevation value for the color gradient

The sliders automatically adapt to the point cloud's actual elevation bounds (in feet). This is useful for highlighting specific elevation ranges or filtering out noise.

### Intensity Range Sliders
When viewing point clouds in **INTENSITY** mode, you can adjust the intensity range to enhance contrast:

- **Min Intensity Slider** - Sets the minimum intensity value (0-65535)
- **Max Intensity Slider** - Sets the maximum intensity value (0-65535)

Adjusting these sliders helps enhance features with specific intensity values, which is useful for identifying different materials or surface properties.

## How It Works

The controls interact with Potree's material system:

- **Classifications**: Updates `material.classification[classNum].visible` for each class
- **Elevation Range**: Updates `material.elevationRange = [min, max]`
- **Intensity Range**: Updates `material.intensityRange = [min, max]`

The UI dynamically shows/hides these controls based on the selected display mode, keeping the interface clean and contextual.

## Usage Example

```jsx
import { HwcPotree, PotreePanel } from '@hwc/potree';

function MyViewer() {
  const [viewers, setViewers] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  return (
    <>
      <HwcPotree
        pointCloudUrl="https://example.com/metadata.json"
        name="My Point Cloud"
        location={{ lat: 40.0, lon: -86.0, z: 800 }}
        crs={{ proj4: '+proj=...' }}
        onViewerReady={setViewers}
      />
      
      {viewers && (
        <PotreePanel
          potreeViewer={viewers.potreeViewer}
          cesiumViewer={viewers.cesiumViewer}
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
          position="left"
        />
      )}
    </>
  );
}
```

The Appearance section in the panel will automatically show the appropriate controls based on the selected display mode.

## Navigation Cube

3D orientation helper that displays in the top-right corner during 3D mode.

**Features:**
- Real-time rotation sync with main camera
- Clickable faces for quick navigation to standard views
- Color-coded faces: Top (green), Bottom (gray), N/S (amber), E/W (blue)
- Smooth camera transitions with ease-in-out animation (800ms)
- Hover effects with emissive highlighting
- High-quality textures with gradients and shadows
- Scales slightly on hover for better feedback

**Usage:**
```jsx
<NavigationCube
  potreeViewer={potreeViewer}
  cesiumViewer={cesiumViewer}
/>
```

**Standard Views:**
- **Top**: Camera positioned directly above the point cloud
- **Bottom**: Camera positioned directly below
- **N (North)**: Camera facing north with slight elevation
- **S (South)**: Camera facing south with slight elevation
- **E (East)**: Camera facing east with slight elevation
- **W (West)**: Camera facing west with slight elevation

## Controls by Mode

**2D Mode:**
- Zoom controls (built into HwcMap)
- Pan/drag to navigate
- Layer toggle (streets/satellite)
- Mode toggle (2D/3D)

**3D Mode:**
- PotreeControls (zoom in/out, reset view)
- NavigationCube (orientation + quick navigation)
- Mouse controls (rotate, pan, zoom)
- Layer toggle (streets/satellite)
- Mode toggle (2D/3D)
- PotreePanel (tools and settings)
