# @hwc/panel

Reusable, responsive panel component for HWC applications. Auto-responsive design that displays as a left sidebar on desktop and bottom drawer on mobile.

## Features

- **Auto-responsive**: Left sidebar on desktop (>768px), bottom drawer on mobile
- **Collapsible sections**: Accordion-style content organization
- **Smooth animations**: CSS transitions for open/close and hover states
- **Backdrop blur**: Modern glass effect styling
- **CSS variables**: Consistent theming with other HWC components
- **Accessible**: ARIA attributes and keyboard navigation

## Installation

This package is designed for use in HWC monorepo workspaces:

```bash
npm install  # from monorepo root
```

## Required peer dependencies

```bash
npm install react react-dom react-icons
```

## Basic Usage

```jsx
import { HwcPanel, PanelSection } from '@hwc/panel';
import { useState } from 'react';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    tools: true,
    settings: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <HwcPanel
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      title="Tools Panel"
      position="left"
      toggleLabel="Open Tools"
    >
      <PanelSection
        title="Tools"
        icon={<ToolIcon />}
        isExpanded={expandedSections.tools}
        onToggle={() => toggleSection('tools')}
      >
        <div>Tool content here...</div>
      </PanelSection>

      <PanelSection
        title="Settings"
        iconPath="/icons/settings.svg"
        isExpanded={expandedSections.settings}
        onToggle={() => toggleSection('settings')}
      >
        <div>Settings content here...</div>
      </PanelSection>
    </HwcPanel>
  );
}
```

## Position Options

The panel can be positioned on either side of the screen:

```jsx
// Left side (default)
<HwcPanel position="left" {...props} />

// Right side (useful when map controls are on the right)
<HwcPanel position="right" {...props} />
```

On mobile (<768px), the panel always displays as a bottom drawer regardless of the `position` prop.

## API Reference

### HwcPanel

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Controls panel visibility |
| `onToggle` | `function` | - | Called when panel is opened/closed |
| `title` | `string` | `"Panel"` | Panel header title |
| `position` | `string` | `"left"` | Panel position: `"left"` or `"right"` |
| `toggleLabel` | `string` | `"Open Panel"` | Accessibility label for toggle button |
| `children` | `ReactNode` | - | Panel content (typically PanelSection components) |

### PanelSection

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Section header title |
| `icon` | `ReactNode` | - | React icon component |
| `iconPath` | `string` | - | Path to icon image (alternative to `icon`) |
| `isExpanded` | `boolean` | - | Controls section visibility |
| `onToggle` | `function` | - | Called when section is expanded/collapsed |
| `children` | `ReactNode` | - | Section content |

## Styling

The panel uses CSS variables for theming. Set these in your app's CSS:

```css
:root {
  --hwc-red: #EE2F27;
  --hdr-bg: rgba(41, 44, 48, 0.95);
  --hdr-fg: #ffffff;
  --hdr-border: rgba(255, 255, 255, 0.1);
  --accent: #EE2F27;
  --header-h: 60px; /* Height of your app header */
}
```

## Form Elements

The package includes styled form element classes:

```jsx
<input type="range" className="panel-slider" />
<select className="panel-select">...</select>
<button className="panel-button">...</button>
<label className="panel-checkbox-label">
  <input type="checkbox" className="panel-checkbox" />
  Label text
</label>
```

## Responsive Behavior

- **Desktop (>768px)**: Fixed sidebar, 300px wide
  - `position="left"`: Left edge with right border
  - `position="right"`: Right edge with left border
- **Mobile (≤768px)**: Bottom drawer, full width, max 70vh height (position prop ignored)
- **Toggle button**: 
  - Desktop left: Left edge tab pointing right
  - Desktop right: Right edge tab pointing left
  - Mobile: Bottom center button

## Integration with Astro

```astro
---
import { HwcPanel, PanelSection } from '@hwc/panel';
---

<HwcPanel client:only="react" isOpen={true} title="My Panel">
  <PanelSection title="Section 1" isExpanded={true}>
    Content here
  </PanelSection>
</HwcPanel>
```

## Using with @hwc/map

When using the panel alongside the map component, consider positioning to avoid control conflicts:

```astro
---
import { HwcMap } from '@hwc/map';
import { HwcPanel } from '@hwc/panel';
---

<!-- Map controls are bottom-right, so left panel works well -->
<HwcPanel client:only="react" position="left" {...panelProps} />
<HwcMap client:only="react" {...mapProps} />

<!-- Or use right panel if you have left-side controls -->
<HwcPanel client:only="react" position="right" {...panelProps} />
```

The map's zoom controls and layer toggles are positioned at `bottom-right`, so they won't conflict with either panel position.