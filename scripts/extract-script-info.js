const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function extractUserscriptMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract metadata block
  const metadataMatch = content.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  if (!metadataMatch) {
    console.error(`No metadata found in ${filePath}`);
    return null;
  }

  const metadata = metadataMatch[1];
  const info = {};

  // Extract description
  const descMatch = metadata.match(/@description\s+(.+)/);
  if (descMatch) {
    info.description = descMatch[1].trim();
  }

  // Extract name
  const nameMatch = metadata.match(/@name\s+(.+)/);
  if (nameMatch) {
    info.name = nameMatch[1].trim();
  }

  return info;
}

// Find all .user.js files in project root
const files = fs.readdirSync(projectRoot).filter((f) => f.endsWith('.user.js'));
const scripts = [];

for (const file of files) {
  const info = extractUserscriptMetadata(path.join(projectRoot, file));
  if (info) {
    scripts.push({
      ...info,
      filename: file,
      screenshot: `/tampermonkey-parkrun/images/${file.replace('.user.js', '')}.png`,
      install_url: `https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/${file}`,
    });
  }
}

const outPath = path.join(projectRoot, 'docs', '_data', 'scripts.json');
fs.writeFileSync(outPath, JSON.stringify(scripts, null, 2), 'utf8');
console.log('✅ Generated', outPath);
