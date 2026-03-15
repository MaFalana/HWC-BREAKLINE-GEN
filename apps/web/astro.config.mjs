// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to copy Potree libs to public folder
function copyPotreePlugin() {
  return {
    name: 'copy-potree',
    buildStart() {
      const src = path.resolve(__dirname, '../../packages/potree/public');
      const dest = path.resolve(__dirname, 'public/potree');
      
      // Create symlink or copy
      if (!fs.existsSync(dest)) {
        try {
          // Try symlink first (faster)
          fs.symlinkSync(src, dest, 'dir');
          console.log('✓ Symlinked Potree libs from package');
        } catch (err) {
          // Fall back to copying
          console.log('Symlink failed, copying Potree libs...');
          copyDir(src, dest);
        }
      }
    }
  };
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [copyPotreePlugin()],
    server: {
      fs: {
        allow: ['..', '../..']
      }
    }
  }
});