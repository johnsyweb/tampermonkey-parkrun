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

function isVersionOnlyCommit(root, commit, filePath) {
  const result = runGit(root, ['show', '--format=', '--unified=0', commit, '--', filePath]);
  if (result.status !== 0 || !result.stdout.trim()) {
    return false;
  }

  const changedLines = result.stdout
    .split('\n')
    .filter(
      (line) =>
        (line.startsWith('+') || line.startsWith('-')) &&
        !line.startsWith('+++') &&
        !line.startsWith('---')
    );

  return changedLines.length > 0 && changedLines.every((line) => /@version\b/.test(line));
}

function latestMeaningfulCommit(root, filePath) {
  const result = runGit(root, ['log', '--format=%H', '--', filePath]);
  if (result.status !== 0) {
    return null;
  }

  const commits = result.stdout.trim().split('\n').filter(Boolean);
  for (const commit of commits) {
    if (!isVersionOnlyCommit(root, commit, filePath)) {
      return commit;
    }
  }

  return commits[0] || null;
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
      const sourceCommit = latestMeaningfulCommit(root, sourcePath);
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
