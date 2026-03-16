# @hwc/ui

Reusable UI primitives for HWC applications.

## Components

### SearchBar
Generic search input with optional filter dropdown.

```jsx
import { SearchBar } from '@hwc/ui';

<SearchBar
  placeholder="Search..."
  onSearch={(query) => console.log(query)}
  showFilter={true}
  filterContent={<YourCustomFilters />}
/>
```

### SortDropdown
Configurable sort dropdown with custom options.

```jsx
import { SortDropdown } from '@hwc/ui';

<SortDropdown
  options={[
    { label: 'Name (A-Z)', value: 'name', order: 'asc' },
    { label: 'Date (Newest)', value: 'date', order: 'desc' },
  ]}
  value={{ value: 'name', order: 'asc' }}
  onChange={(sortBy, sortOrder) => console.log(sortBy, sortOrder)}
/>
```

### ViewToggle
Icon-based view switcher.

```jsx
import { ViewToggle } from '@hwc/ui';
import { FaRegMap, IoGrid, FaListUl } from 'react-icons/fa';

<ViewToggle
  views={[
    { id: 'map', icon: <FaRegMap />, label: 'Map view' },
    { id: 'card', icon: <IoGrid />, label: 'Card view' },
    { id: 'list', icon: <FaListUl />, label: 'List view' },
  ]}
  value="map"
  onChange={(viewId) => console.log(viewId)}
/>
```

## Installation

This package is designed for use in HWC monorepo workspaces:

```bash
npm install  # from monorepo root
```

## Styling

Components use CSS variables for theming:

```css
:root {
  --hwc-red: #EE2F27;
  --hdr-bg: rgba(41, 44, 48, 0.95);
  --hdr-fg: #ffffff;
  --hdr-border: rgba(255, 255, 255, 0.1);
  --accent: #EE2F27;
}
```
