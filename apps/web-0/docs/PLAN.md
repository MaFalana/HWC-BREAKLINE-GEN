# PLAN.md - Implementation Plan

## Project Overview
Create a responsive React/TypeScript frontend for the LiDAR Surface Generator API that allows users to upload point cloud files, configure processing parameters, preview results, and download outputs.

## Phase 1: Project Setup
1. **Initialize React Project**
   - Set up Vite + React + TypeScript
   - Configure Tailwind CSS with HWC color palette
   - Use existing .env.dev and .env.prod files
   - Configure project structure

2. **Install Dependencies**
   - axios for API calls
   - react-dropzone for file uploads
   - react-query for data fetching
   - react-table for PNEZD preview
   - Additional UI libraries as needed

## Phase 2: Core Components Development

### Layout Structure
Create main layout following Reference Image 2 with 4 sections:

1. **Section 1: Select Point Cloud Files**
   - Drag & drop zone component
   - File selection button
   - File validation (LAS/LAZ only)
   - Display selected files list

2. **Section 2: Configure Processing**
   - Grid spacing toggle (25 feet / 50 feet)
   - Source CRS dropdown (populated from EPSG.json)
   - Target CRS dropdown
   - Output format selection (DXF, CSV)
   - Output units dropdown
   - Merge point clouds toggle
   - Process button

3. **Section 3: PNEZD Preview**
   - Table component showing first 50 points
   - Column headers: Point, Northing, Easting, Elevation, Description
   - Statistics display (Min/Avg/Max elevation)
   - Loading states

4. **Section 4: Outputs**
   - Format selection toggles
   - Download button
   - Download progress indicator

## Phase 3: API Integration

### Services to Implement
1. **Upload Service**
   - Handle multipart form data
   - Progress tracking
   - Error handling

2. **Job Service**
   - Poll job status
   - Update UI based on status
   - Handle job lifecycle

3. **Download Service**
   - Get download URLs
   - Handle file downloads
   - Progress tracking

## Phase 4: State Management
- Use React Context or Zustand for global state
- Manage:
  - Current job ID
  - Processing status
  - Selected files
  - Configuration settings
  - Preview data

## Phase 5: Styling & Polish
1. **Apply HWC Branding**
   - Colors: #EE2F27, #292C30, #6C6864, #DDD4CC
   - Fonts: Poppins (fallback from Neuzit Grotesk)
   - Logo placement
   - Consistent spacing

2. **Responsive Design**
   - Mobile-first approach
   - Breakpoints for tablet/desktop
   - Touch-friendly controls

## Phase 6: Error Handling & UX
- Loading states for all async operations
- Error messages and recovery options
- Input validation
- Success notifications
- Progress indicators

## Phase 7: Testing & Optimization
- Component testing
- API integration testing
- Performance optimization
- Build optimization
- Cross-browser testing

## Technical Decisions
- **Build Tool**: Vite (fast, modern)
- **Styling**: Tailwind CSS (as per spec)
- **State Management**: React Query + Context
- **File Upload**: react-dropzone
- **HTTP Client**: Axios
- **Table**: react-table or custom component
- **Deployment**: Vercel or Azure Static Web Apps
- **Environment**: Use existing .env.dev and .env.prod files

## File Structure
```
/
├── src/
│   ├── components/
│   │   ├── FileUpload/
│   │   ├── Configuration/
│   │   ├── Preview/
│   │   └── Download/
│   ├── services/
│   │   ├── api.ts
│   │   ├── upload.ts
│   │   └── jobs.ts
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── App.tsx
├── public/
│   └── assets/
├── .env.dev (existing)
├── .env.prod (existing)
├── .env.test (existing)
└── package.json
```

## Success Criteria
- [ ] Users can upload LAS/LAZ files
- [ ] Processing configuration works correctly
- [ ] Job status updates in real-time
- [ ] PNEZD preview displays correctly
- [ ] Files download successfully
- [ ] Responsive on all devices
- [ ] Matches HWC brand guidelines
- [ ] Clean, intuitive UX