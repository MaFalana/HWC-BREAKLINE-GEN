# LiDAR Breakline Generator Frontend

A responsive web application for processing LiDAR point cloud files and generating breaklines.

## Project Overview

This frontend application interfaces with a FastAPI backend to provide users with an intuitive way to:
- Upload LAS/LAZ point cloud files
- Configure processing parameters
- Preview processed data (PNEZD format)
- Download breakline outputs in DXF or CSV formats

## Features

- **Drag & Drop File Upload**: Easy file upload with validation for LAS/LAZ formats
- **Configuration Options**: Grid spacing, coordinate reference systems, output formats
- **Real-time Processing**: Job status tracking and progress updates
- **Data Preview**: View first 50 processed points with elevation statistics
- **Multiple Output Formats**: Download results as DXF or CSV files

## Tech Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **API Communication**: Axios
- **File Upload**: react-dropzone

## API Integration

The frontend connects to the FastAPI backend deployed at:
- Development: Configure in `.env.dev`
- Production: Configure in `.env.prod`

## Project Structure

```
/
├── docs/               # Documentation files
│   ├── TASKS.md       # Current session tasks and context
│   └── PLAN.md        # Implementation plan
├── source/            # Reference files (read-only)
│   ├── openapi.json   # API specification
│   └── EPSG.json      # Coordinate reference systems
├── spec/              # Project specifications
├── references/        # UI reference images
├── assets/            # HWC branding assets
└── src/               # Application source code
```

## File Descriptions

### Configuration Files
- `.env.dev` - Development environment variables (API URLs, Azure storage)
- `.env.prod` - Production environment variables
- `.env.test` - Testing environment variables

### Documentation
- `docs/TASKS.md` - Session task tracking and context
- `docs/PLAN.md` - Detailed implementation plan
- `docs/API_ENDPOINTS_README.md` - API endpoint documentation
- `docs/FRONTEND_INTEGRATION_GUIDE.md` - Frontend integration guide

### Specifications
- `spec/Style.md` - UI styling guidelines and color palette
- `spec/Technical Stack.md` - Technology choices and architecture
- `spec/Coding Preferences.md` - Code style guidelines
- `spec/Communication Preferences.md` - Development communication guidelines
- `spec/Workflow Preferences.md` - Development workflow
- `spec/Mission Statement.md` - Project mission and goals

### Assets
- `assets/HWC Angle Logo 16px.png` - Favicon
- `assets/HWC Logo_Dark.png` - Dark theme logo
- `assets/HWC Logo_Light.png` - Light theme logo

### Reference Data
- `source/openapi.json` - Complete API specification
- `source/EPSG.json` - Coordinate reference system definitions

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Environment Variables

The application uses different environment files for different stages:
- `.env.dev` - Development configuration
- `.env.prod` - Production configuration
- `.env.test` - Testing configuration

Key variables:
- `API_BASE_URL` - Backend API endpoint
- `AZURE_BLOB_*` - Azure storage configuration (handled by API)

## UI Sections

1. **Select Point Cloud Files**: Upload interface with drag-and-drop
2. **Configure Processing**: Settings for processing parameters
3. **PNEZD Preview**: Table view of processed points with statistics
4. **Outputs**: Download options for processed files

## Brand Guidelines

- **Primary Color**: #EE2F27 (HWC Red)
- **Secondary Colors**: #292C30, #6C6864, #DDD4CC
- **Fonts**: Poppins (primary), system fonts (fallback)

## Notes

- Files are automatically managed by the API (deleted after 4-24 hours)
- All file storage and maintenance is handled by the backend
- The frontend focuses solely on user interaction and display