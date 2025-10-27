const fs = require('fs');

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

// Find all .user.js files
const files = fs.readdirSync('.').filter(f => f.endsWith('.user.js'));
const scripts = [];

for (const file of files) {
  const info = extractUserscriptMetadata(file);
  if (info) {
    scripts.push({
      ...info,
      filename: file,
      screenshot: `/tampermonkey-parkrun/images/${file.replace('.user.js', '')}.png`,
      install_url: `https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/${file}`,
    });
  }
}

console.log(JSON.stringify(scripts, null, 2));

