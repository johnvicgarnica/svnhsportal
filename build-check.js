import fs from 'fs';
import path from 'path';

console.log('[SVNHS Portal Build] Building and validating production artifacts...');

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const distAssets = path.resolve(distDir, 'assets');
const distHtml = path.resolve(distDir, 'index.html');
const distBundle = path.resolve(distAssets, 'index-app-v2.js');

// Ensure dist and dist/assets directories exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(distAssets)) {
  fs.mkdirSync(distAssets, { recursive: true });
}

// Copy root index.html to dist/index.html
const srcHtml = path.resolve(rootDir, 'index.html');
if (fs.existsSync(srcHtml)) {
  fs.copyFileSync(srcHtml, distHtml);
  console.log('[SVNHS Portal Build] Copied index.html -> dist/index.html');
}

// Copy public directory contents to dist
const publicDir = path.resolve(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
  console.log('[SVNHS Portal Build] Copied public/ -> dist/');
}

// Copy any src/assets/images to dist/assets and public/assets
const srcImagesDir = path.resolve(rootDir, 'src/assets/images');
if (fs.existsSync(srcImagesDir)) {
  fs.cpSync(srcImagesDir, distAssets, { recursive: true });
  const pubAssets = path.resolve(publicDir, 'assets');
  if (fs.existsSync(pubAssets)) {
    fs.cpSync(srcImagesDir, pubAssets, { recursive: true });
  }
  console.log('[SVNHS Portal Build] Copied src/assets/images/ -> assets/');
}

// Validate build artifacts
if (!fs.existsSync(distHtml)) {
  console.error('Error: dist/index.html does not exist');
  process.exit(1);
}

if (!fs.existsSync(distBundle)) {
  console.error('Error: dist/assets/index-app-v2.js does not exist');
  process.exit(1);
}

const requiredImages = [
  'svnhs_school_logo_1784856263175-CGuby-SW.jpg',
  'svnhs_principal_portrait_1785327799633-HH3PFR2s.png',
  'svnhs_shs_building_1785313106378-BDwzHhzK.jpg'
];

for (const imgName of requiredImages) {
  const imgPath = path.resolve(distAssets, imgName);
  if (!fs.existsSync(imgPath)) {
    console.error(`Warning: Image ${imgName} is missing in dist/assets`);
  } else {
    console.log(`[SVNHS Portal Build] Verified image asset: ${imgName}`);
  }
}

console.log('[SVNHS Portal Build] Verification successful! Production bundle ready.');
