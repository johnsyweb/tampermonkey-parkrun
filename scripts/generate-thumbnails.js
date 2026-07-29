/**
 * Generates WebP thumbnails from docs/images/*.png at a max width derived from
 * docs/style.css (.scripts-grid) and scripts/docs-layout.js (MAIN_CONTENT_MAX_WIDTH_PX).
 * Full-size PNGs remain for README etc.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getThumbMaxWidth } = require('./docs-layout.js');

const THUMB_MAX_WIDTH = getThumbMaxWidth();
const WEBP_QUALITY = 82;

const projectRoot = path.resolve(__dirname, '..');
const imagesDir = path.join(projectRoot, 'docs', 'images');
const thumbsDir = path.join(imagesDir, 'thumbs');
const requestedNames = new Set(process.argv.slice(2));

if (!fs.existsSync(imagesDir)) {
  console.log('docs/images not found, skipping thumbnails');
  process.exit(0);
}
fs.mkdirSync(thumbsDir, { recursive: true });

async function run() {
  const files = fs
    .readdirSync(imagesDir)
    .filter((file) => file.endsWith('.png'))
    .filter((file) => requestedNames.size === 0 || requestedNames.has(path.basename(file, '.png')));
  let done = 0;
  for (const file of files) {
    const base = path.basename(file, '.png');
    const src = path.join(imagesDir, file);
    const dest = path.join(thumbsDir, `${base}.webp`);
    try {
      await sharp(src)
        .resize(THUMB_MAX_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(dest);
      done++;
    } catch (err) {
      console.error(`Failed ${file}:`, err.message);
    }
  }
  console.log(
    `✅ Generated ${done} WebP thumbnails in docs/images/thumbs/ (max width ${THUMB_MAX_WIDTH}px from layout)`
  );
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
