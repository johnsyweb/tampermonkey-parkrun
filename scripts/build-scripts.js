#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const UglifyJS = require('uglify-js');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

// Clean dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Transpile with babel
try {
  run('npx babel src --out-dir dist --extensions ".js" --copy-files');
} catch (err) {
  console.error('Babel transpile failed');
  process.exit(1);
}

// Find built .user.js files and copy to repo root with banner
const builtFiles = glob.sync('**/*.user.js', { cwd: distDir, nodir: true });
if (!builtFiles.length) {
  console.log('No built .user.js files found in dist/');
  process.exit(0);
}

const bannerLines = [
  '// DO NOT EDIT - generated from src/ by scripts/build-scripts.js',
  '// Built: ' + new Date().toISOString(),
];

for (const rel of builtFiles) {
  const srcPath = path.join(distDir, rel);
  const destPath = path.join(root, path.basename(rel));
  const content = fs.readFileSync(srcPath, 'utf8');
  // Extract userscript metadata block if present
  const metaRegex = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/;
  const metaMatch = content.match(metaRegex);
  let destContent = '';
  if (metaMatch) {
    const metaBlock = metaMatch[0].trim();
    // Remove the metadata from the body
    const body = content.replace(metaRegex, '').replace(/^\s+/, '');
    destContent = metaBlock + '\n' + bannerLines.join('\n') + '\n\n' + body;
  } else {
    destContent = bannerLines.join('\n') + '\n' + content;
  }
  fs.writeFileSync(destPath, destContent, 'utf8');
  console.log(`Wrote ${destPath}`);
}

// Generate bookmarklets and update README.md
const bookmarklets = [];
for (const rel of builtFiles) {
  const srcPath = path.join(distDir, rel);
  let content = fs.readFileSync(srcPath, 'utf8');
  // try to extract metadata block
  const metaMatch = content.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
  let name = path.basename(rel);
  let description = '';
  if (metaMatch) {
    const meta = metaMatch[1];
    const nameMatch = meta.match(/@name\s+(.+)/);
    const descMatch = meta.match(/@description\s+(.+)/);
    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
  }

  // remove metadata block for bookmarklet body
  let body = content.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\s*/, '').trim();
  // remove sourceMappingURL comments
  body = body.replace(/\/\/# sourceMappingURL=.*$/gm, '');

  // Minify
  let minified = null;
  try {
    const result = UglifyJS.minify(body, { compress: true, mangle: true });
    if (result.error) {
      console.warn(`Uglify failed for ${rel}:`, result.error);
      minified = body;
    } else {
      minified = result.code;
    }
  } catch (err) {
    console.warn(`Uglify exception for ${rel}:`, err && err.message);
    minified = body;
  }

  // Ensure it is an IIFE; if not, wrap it
  if (!/^[\s(]*(?:async\b|\(|function\b)/.test(minified)) {
    minified = `(function(){${minified}})()`;
  }

  const bookmarklet = 'javascript:' + minified;
  const rawUrl = `https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/${path.basename(rel)}`;
  bookmarklets.push({ file: path.basename(rel), name, description, rawUrl, bookmarklet });
}

// Update README.md between the Bookmarklets header and END marker
const readmePath = path.join(root, 'README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  const startMarker = '## Bookmarklets';
  const endMarker = '<!-- END BOOKMARKLETS SECTION -->';
  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);
  const generated = [];
  generated.push('## Bookmarklets\n');
  generated.push(
    'You can also use these scripts as bookmarklets by creating bookmarks with the following URLs:\n'
  );
  for (const b of bookmarklets) {
    generated.push(`### ${b.name}\n`);
    if (b.description) generated.push(`> ${b.description}\n`);
    generated.push(`[${b.file}](${b.rawUrl})\n\n`);
    generated.push('```javascript\n' + b.bookmarklet + '\n```\n');
  }
  const newSection = generated.join('\n');

  if (endIndex !== -1) {
    const prefix = startIndex !== -1 ? readme.slice(0, startIndex) : readme.slice(0, endIndex);
    const suffix = readme.slice(endIndex);
    const updated = prefix + newSection + '\n' + suffix;
    fs.writeFileSync(readmePath, updated, 'utf8');
    console.log('Updated README.md with bookmarklets');
  } else {
    // append
    readme += '\n' + newSection + '\n' + endMarker + '\n';
    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log('Appended bookmarklets to README.md');
  }
}

console.log('Build complete');
