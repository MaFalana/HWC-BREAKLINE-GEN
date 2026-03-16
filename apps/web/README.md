# Breakline Generator — Web Frontend

Astro site with a React island for the LiDAR breakline processing UI.

## Architecture

```
apps/web/
├── src/
│   ├── pages/
│   │   └── index.astro            # Single page, loads BreaklineApp as React island
│   ├── components/breakline/
│   │   ├── BreaklineApp.tsx       # Root component (state, polling, orchestration)
│   │   ├── FileUpload.tsx         # Drag-and-drop LAS/LAZ upload
│   │   ├── Configuration.tsx      # Processing params (EPSG, voxel size, merge, formats)
│   │   ├── Preview.tsx            # PNEZD point table + elevation stats
│   │   ├── Download.tsx           # Output file download links
│   │   ├── ProgressIndicator.tsx  # Upload/processing progress bar
│   │   └── InfoBoxes.tsx          # Informational cards
│   ├── services/
│   │   ├── api.ts                 # Base fetch wrapper (reads PUBLIC_API_BASE_URL)
│   │   ├── upload.ts              # XHR upload with progress callback
│   │   └── jobs.ts                # Job status, preview, download, cancel
│   ├── types/
│   │   └── index.ts               # Shared TypeScript interfaces
│   └── styles/
│       ├── global.css             # CSS custom properties (colors, fonts, spacing)
│       └── breakline.css          # Component styles (no Tailwind)
├── public/assets/                 # Branding assets (synced via npm run assets:sync)
├── astro.config.mjs               # Astro + React integration
├── .env                           # Local env vars (not committed)
└── package.json
```

## Shared Packages

- `@hwc/header` — site header bar component
- `@hwc/ui` — shared UI components (Combobox for EPSG selection, etc.)

## Environment Variables

| Variable | Description |
|---|---|
| `PUBLIC_API_BASE_URL` | API base URL (e.g. `http://localhost:8000` locally) |

Copy `env.example` to `.env` and fill in values for local development.

## Local Development

```bash
# From monorepo root
npm install
npm run assets:sync
npm run dev:web
```

Or from this directory:

```bash
npm run dev
```

Dev server runs at `http://localhost:4321`. Requires the API running at the URL specified in `.env`.

## Build

```bash
npm run build
```

Static output goes to `dist/`. Deployed to Azure Static Web Apps via GitHub Actions.
