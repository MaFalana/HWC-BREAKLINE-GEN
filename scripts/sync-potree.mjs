import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const potreeSrc = path.join(repoRoot, "packages", "potree", "public");
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

if (!exists(potreeSrc)) {
  console.error(`Missing Potree source directory: ${potreeSrc}`);
  console.error(`Please place Potree 1.8.2 in packages/potree/public/1.8.2/`);
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
  const publicPotreeDest = path.join(appsDir, appName, "public", "potree");
  // Copy packages/potree/public/* into apps/<app>/public/potree/*
  fs.mkdirSync(publicPotreeDest, { recursive: true });
  copyDir(potreeSrc, publicPotreeDest);
  console.log(`Synced Potree libs -> apps/${appName}/public/potree`);
}
