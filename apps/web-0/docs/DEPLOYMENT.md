# Deployment Guide - LiDAR Breakline Generator

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- GitHub repository

### Steps
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial frontend implementation"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect GitHub repo to Vercel
   - Vercel will auto-detect Vite configuration
   - Set environment variable: `VITE_API_BASE_URL=https://surface-gen-api.purplebush-adcf4e3b.eastus.azurecontainerapps.io`

3. **Custom Domain (Optional)**
   - Add custom domain in Vercel dashboard
   - Update DNS records as instructed

### Environment Variables
- `VITE_API_BASE_URL` - Your FastAPI backend URL

## Azure Static Web Apps Deployment

### Prerequisites
- Azure account
- Azure CLI or GitHub Actions

### Steps
1. **Create Static Web App**
   ```bash
   az staticwebapp create \
     --name lidar-breakline-generator \
     --resource-group your-resource-group \
     --source https://github.com/your-username/your-repo \
     --location "East US 2" \
     --branch main \
     --app-location "/" \
     --output-location "dist"
   ```

2. **Configure Build**
   - Azure will auto-detect Vite
   - Set environment variables in Azure portal

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

### Development (.env.dev)
```
VITE_API_BASE_URL=https://surface-gen-api.purplebush-adcf4e3b.eastus.azurecontainerapps.io
```

### Production (.env.prod)
```
VITE_API_BASE_URL=https://surface-gen-api.purplebush-adcf4e3b.eastus.azurecontainerapps.io
```

## Post-Deployment Checklist
- [ ] Test file upload functionality
- [ ] Verify job processing and status updates
- [ ] Test download functionality
- [ ] Check responsive design on mobile devices
- [ ] Verify all API endpoints are accessible
- [ ] Test error handling scenarios