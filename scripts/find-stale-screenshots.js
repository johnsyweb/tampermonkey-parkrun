#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

function runGit(root, args) {
  return childProcess.spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  });
}

function latestCommit(root, filePath) {
  const result = runGit(root, ['log', '-1', '--format=%H', '--', filePath]);
  return result.status === 0 ? result.stdout.trim() || null : null;
}

function isAncestor(root, ancestor, descendant) {
  return runGit(root, ['merge-base', '--is-ancestor', ancestor, descendant]).status === 0;
}

function hasScreenshotUrl(source) {
  return /@screenshot-url\s+\S+/.test(source);
}

function isOutputCurrent(root, sourceCommit, outputPath) {
  if (!fs.existsSync(path.join(root, outputPath))) {
    return false;
  }

  const outputCommit = latestCommit(root, outputPath);
  return Boolean(outputCommit && isAncestor(root, sourceCommit, outputCommit));
}

function findStaleScreenshots(root = process.cwd()) {
  const sourceDirectory = path.join(root, 'src');

  return fs
    .readdirSync(sourceDirectory)
    .filter((file) => file.endsWith('.user.js'))
    .filter((file) => hasScreenshotUrl(fs.readFileSync(path.join(sourceDirectory, file), 'utf8')))
    .map((file) => file.replace(/\.user\.js$/, ''))
    .filter((name) => {
      const sourcePath = `src/${name}.user.js`;
      const sourceCommit = latestCommit(root, sourcePath);
      if (!sourceCommit) {
        return true;
      }

      return (
        !isOutputCurrent(root, sourceCommit, `docs/images/${name}.png`) ||
        !isOutputCurrent(root, sourceCommit, `docs/images/thumbs/${name}.webp`)
      );
    });
}

if (require.main === module) {
  process.stdout.write(findStaleScreenshots().join('\n'));
}

module.exports = { findStaleScreenshots };
