// @jest-environment node

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { findStaleScreenshots } = require('../scripts/find-stale-screenshots.js');

function git(root, args) {
  childProcess.execFileSync(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args],
    { cwd: root, stdio: 'ignore' }
  );
}

function write(root, filePath, contents) {
  const absolutePath = path.join(root, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
}

function commit(root, message) {
  git(root, ['add', '.']);
  git(root, ['commit', '-m', message]);
}

describe('findStaleScreenshots', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-screenshots-'));
    git(root, ['init']);
    write(
      root,
      'src/example.user.js',
      '// ==UserScript==\n// @screenshot-url https://example.com\n// ==/UserScript==\n'
    );
    commit(root, 'add source');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('reports missing screenshot outputs as stale', () => {
    expect(findStaleScreenshots(root)).toEqual(['example']);
  });

  it('reports both outputs committed after the source as current', () => {
    write(root, 'docs/images/example.png', 'png');
    write(root, 'docs/images/thumbs/example.webp', 'webp');
    commit(root, 'add outputs');

    expect(findStaleScreenshots(root)).toEqual([]);
  });

  it('reports outputs as stale after the source changes', () => {
    write(root, 'docs/images/example.png', 'png');
    write(root, 'docs/images/thumbs/example.webp', 'webp');
    commit(root, 'add outputs');
    write(
      root,
      'src/example.user.js',
      '// ==UserScript==\n// @screenshot-url https://example.com/new\n// ==/UserScript==\n'
    );
    commit(root, 'update source');

    expect(findStaleScreenshots(root)).toEqual(['example']);
  });

  it('requires the thumbnail as well as the screenshot to be current', () => {
    write(root, 'docs/images/example.png', 'png');
    write(root, 'docs/images/thumbs/example.webp', 'webp');
    commit(root, 'add outputs');
    write(root, 'src/example.user.js', '// @screenshot-url https://example.com/new\n');
    commit(root, 'update source');
    write(root, 'docs/images/example.png', 'new png');
    commit(root, 'update screenshot only');

    expect(findStaleScreenshots(root)).toEqual(['example']);
  });

  it('accepts source and outputs committed together', () => {
    write(root, 'docs/images/example.png', 'png');
    write(root, 'docs/images/thumbs/example.webp', 'webp');
    write(root, 'src/example.user.js', '// @screenshot-url https://example.com/new\n');
    commit(root, 'update source and outputs');

    expect(findStaleScreenshots(root)).toEqual([]);
  });
});
