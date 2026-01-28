const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getThumbMaxWidth } = require('./docs-layout.js');

const projectRoot = path.resolve(__dirname, '..');
const THUMB_MAX_WIDTH = getThumbMaxWidth();
const DEFAULT_DIMENSIONS = { width: 1200, height: 800 };

function parseUserscriptHeader(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  if (!match) return null;
  const meta = match[1];
  const get = (key) => {
    const m = meta.match(new RegExp(`@${key}\\s+(.+)`));
    return m ? m[1].trim() : null;
  };
  return {
    name: get('name'),
    description: get('description'),
    downloadURL: get('downloadURL'),
    version: get('version'),
    author: get('author'),
    homepage: get('homepage'),
    supportURL: get('supportURL'),
    license: get('license'),
  };
}

async function getImageDimensions(imagePath) {
  if (!fs.existsSync(imagePath)) return null;
  try {
    const { width, height } = await sharp(imagePath).metadata();
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

async function run() {
  const files = fs.readdirSync(projectRoot).filter((f) => f.endsWith('.user.js'));
  const scripts = [];

  for (const file of files) {
    const info = parseUserscriptHeader(path.join(projectRoot, file));
    if (!info || !info.name) continue;
    const slug = file.replace('.user.js', '');
    const screenshotPath = path.join(projectRoot, 'docs', 'images', `${slug}.png`);
    const dims = (await getImageDimensions(screenshotPath)) || DEFAULT_DIMENSIONS;
    if (!fs.existsSync(screenshotPath)) {
      console.warn(`⚠️ No screenshot at docs/images/${slug}.png, using default dimensions`);
    }
    const tw = Math.min(THUMB_MAX_WIDTH, dims.width);
    const th = Math.round((dims.height * tw) / dims.width);
    scripts.push({
      name: info.name,
      description: info.description || '',
      filename: file,
      slug,
      screenshot: `/tampermonkey-parkrun/images/${slug}.png`,
      screenshot_webp: `/tampermonkey-parkrun/images/thumbs/${slug}.webp`,
      screenshot_width: tw,
      screenshot_height: th,
      screenshot_full_width: dims.width,
      screenshot_full_height: dims.height,
      install_url:
        info.downloadURL ||
        `https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/${file}`,
      version: info.version || null,
      author: info.author || null,
      homepage: info.homepage || null,
      supportURL: info.supportURL || null,
      license: info.license || null,
    });
  }

  scripts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const outPath = path.join(projectRoot, 'docs', '_data', 'scripts.json');
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outPath, JSON.stringify(scripts, null, 2), 'utf8');
  console.log('✅ Generated', outPath);

  const docsDir = path.join(projectRoot, 'docs');
  const ogImageBase = '/tampermonkey-parkrun/images';
  for (const script of scripts) {
    const userScriptPath = path.join(projectRoot, script.filename);
    const stat = fs.statSync(userScriptPath);
    const lastMod = stat.mtime.toISOString();
    const mdPath = path.join(docsDir, `${script.slug}.md`);
    const desc = (script.description || '').replace(/"/g, '\\"').replace(/\n/g, ' ');
    const ogImageAlt = `Screenshot of ${(script.name || '').replace(/"/g, '\\"')}`;
    const frontmatter = [
      '---',
      `layout: script`,
      `title: "${script.name.replace(/"/g, '\\"')}"`,
      `permalink: /${script.slug}/`,
      `slug: ${script.slug}`,
      `description: "${desc}"`,
      `og_image: ${ogImageBase}/${script.slug}.png`,
      `og_image_alt: "${ogImageAlt}"`,
      `og_image_width: ${script.screenshot_full_width}`,
      `og_image_height: ${script.screenshot_full_height}`,
      `last_modified_at: "${lastMod}"`,
      `updated: "${lastMod}"`,
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(mdPath, frontmatter, 'utf8');
  }
  console.log('✅ Generated', scripts.length, 'script pages at docs/<slug>.md');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
