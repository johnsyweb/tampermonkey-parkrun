#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const firstNonEmpty = lines.find((l) => l.trim() !== '') || '';
  const okFirst = firstNonEmpty.trim() === '// ==UserScript==';
  const hasMeta = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/.test(content);
  if (!okFirst || !hasMeta) {
    console.error(`${path.basename(filePath)}: metadata block not at top`);
    return false;
  }
  return true;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/check-userscript-metadata.js <file1.user.js> [file2 ...]');
  process.exit(2);
}

let failed = false;
for (const f of files) {
  try {
    const ok = checkFile(f);
    if (!ok) failed = true;
  } catch (err) {
    console.error(`Error reading ${f}:`, err.message);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('All userscripts have metadata at the top.');
