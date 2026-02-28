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
const docsDir = path.join(root, 'docs');

// Clean dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Transpile with babel
try {
  run(`npx babel ${srcDir} --out-dir ${distDir} --extensions ".js" --copy-files`);
} catch (err) {
  console.error('Babel transpile failed:', err);
  process.exit(1);
}

// Find built .user.js files and copy to repo root with banner
const builtFiles = glob.sync('**/*.user.js', { cwd: distDir, nodir: true });
if (!builtFiles.length) {
  console.log('No built .user.js files found in dist/');
  process.exit(0);
}

const bannerLines = ['// DO NOT EDIT - generated from src/ by scripts/build-scripts.js'];

for (const rel of builtFiles) {
  const srcPath = path.join(distDir, rel);
  const destPath = path.join(root, path.basename(rel));
  const content = fs.readFileSync(srcPath, 'utf8');
  // Extract userscript metadata block if present
  const metaRegex = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/;
  const metaMatch = content.match(metaRegex);
  let destContent;
  if (metaMatch) {
    let metaBlock = metaMatch[0].trim();
    // Strip @screenshot-* keys so userscript managers only see standard metadata
    metaBlock = metaBlock
      .split('\n')
      .filter((line) => !/^\s*\/\/\s*@screenshot-/.test(line))
      .join('\n');
    // Remove the metadata from the body
    const body = content.replace(metaRegex, '').replace(/^\s+/, '');
    destContent = metaBlock + '\n' + bannerLines.join('\n') + '\n\n' + body;
  } else {
    destContent = bannerLines.join('\n') + '\n' + content;
  }
  // Only rewrite the root .user.js file if the content actually changed.
  // This keeps mtimes stable when src/ is unchanged, so downstream steps
  // (like screenshot generation) can reliably detect real changes.
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');
    if (existing === destContent) {
      console.log(`Unchanged ${destPath}, skipping write`);
      continue;
    }
  }
  fs.writeFileSync(destPath, destContent, 'utf8');
  console.log(`Wrote ${destPath}`);
}

// Generate bookmarklets (for Jekyll data and optional README usage)
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
  let minified;
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

// Write bookmarklets JSON for Jekyll data (keyed by built filename)
if (bookmarklets.length) {
  const dataDir = path.join(docsDir, '_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const bookmarkletsByFile = {};
  for (const b of bookmarklets) {
    bookmarkletsByFile[b.file] = {
      name: b.name,
      description: b.description,
      rawUrl: b.rawUrl,
      bookmarklet: b.bookmarklet,
    };
  }

  const bookmarkletsPath = path.join(dataDir, 'bookmarklets.json');
  fs.writeFileSync(bookmarkletsPath, JSON.stringify(bookmarkletsByFile, null, 2), 'utf8');
  console.log(`Wrote ${bookmarkletsPath}`);
}

console.log('Build complete');
