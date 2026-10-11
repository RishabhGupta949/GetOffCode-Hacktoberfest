import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_DIR = path.join(__dirname, '..', 'extension');
const OUTPUT_DIR = path.join(__dirname, '..', 'landing', 'public', 'downloads');
const OUTPUT_ZIP = path.join(OUTPUT_DIR, 'touchgrass-extension.zip');

const EXTENSION_FILES = [
  'manifest.json',
  'background.js',
  'activity-monitor.js',
  'popup.html',
  'popup.js',
  'break.html',
  'break.js',
  'break-overlay.js',
  'break-offer.html',
  'break-offer.js',
  'reflection.html',
  'reflection.js',
];

const ICON_SIZES = [16, 32, 48, 128];

async function packageExtension() {
  console.log('📦 Packaging TouchGrass extension...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const tempDir = path.join(OUTPUT_DIR, 'touchgrass-extension-temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  for (const file of EXTENSION_FILES) {
    const src = path.join(EXTENSION_DIR, file);
    const dest = path.join(tempDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ Copied ${file}`);
    } else {
      console.warn(`  ⚠ Missing ${file}`);
    }
  }

  const iconsDir = path.join(tempDir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  
  for (const size of ICON_SIZES) {
    const svgSrc = path.join(EXTENSION_DIR, 'icons', `icon${size}.svg`);
    if (fs.existsSync(svgSrc)) {
      fs.copyFileSync(svgSrc, path.join(iconsDir, `icon${size}.svg`));
      console.log(`  ✓ Copied icon${size}.svg`);
    }
  }

  // Create minimal PNG placeholders
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
    0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  for (const size of ICON_SIZES) {
    const pngDest = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(pngDest, minimalPng);
  }
  console.log(`  ✓ Created placeholder PNG icons`);

  const manifestPath = path.join(tempDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.icons = {};
  for (const size of ICON_SIZES) {
    manifest.icons[size] = `icons/icon${size}.png`;
  }
  // Remove localhost host_permission for production build
  manifest.host_permissions = manifest.host_permissions.filter(
    (p) => !p.includes('127.0.0.1') && !p.includes('localhost')
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Updated manifest.json with icon references and production host_permissions`);

  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`\n✅ Extension packaged successfully!`);
      console.log(`   Output: ${OUTPUT_ZIP}`);
      console.log(`   Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
      
      fs.rmSync(tempDir, { recursive: true, force: true });
      resolve(OUTPUT_ZIP);
    });

    archive.on('error', (err) => {
      fs.rmSync(tempDir, { recursive: true, force: true });
      reject(err);
    });

    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();
  });
}

packageExtension().catch((err) => {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
});