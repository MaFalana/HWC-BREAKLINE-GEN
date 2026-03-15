import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const assetsSrc = path.join(repoRoot, "packages", "assets");

// Add more apps later if you create them (apps/admin, apps/viewer, etc.)
const appsDir = path.join(repoRoot, "apps");

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!exists(assetsSrc)) {
  console.error(`Missing assets source directory: ${assetsSrc}`);
  process.exit(1);
}

if (!exists(appsDir)) {
  console.error(`Missing apps directory: ${appsDir}`);
  process.exit(1);
}

const appNames = fs
  .readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const appName of appNames) {
  const publicAssetsDest = path.join(appsDir, appName, "public", "assets");
  // We copy packages/assets/* into apps/<app>/public/assets/*
  fs.mkdirSync(publicAssetsDest, { recursive: true });
  copyDir(assetsSrc, publicAssetsDest);
  console.log(`Synced assets -> apps/${appName}/public/assets`);
}
