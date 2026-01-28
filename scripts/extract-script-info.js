const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

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
  };
}

const files = fs.readdirSync(projectRoot).filter((f) => f.endsWith('.user.js'));
const scripts = [];

for (const file of files) {
  const info = parseUserscriptHeader(path.join(projectRoot, file));
  if (!info || !info.name) continue;
  const slug = file.replace('.user.js', '');
  scripts.push({
    name: info.name,
    description: info.description || '',
    filename: file,
    screenshot: `/tampermonkey-parkrun/images/${slug}.png`,
    install_url:
      info.downloadURL ||
      `https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/${file}`,
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
