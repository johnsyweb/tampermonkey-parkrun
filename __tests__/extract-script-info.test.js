const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  SCRIPT_DESCRIPTION_SUFFIX,
  escapeYamlDoubleQuoted,
  getScriptDescriptionPath,
  loadScriptAbout,
  parseUserscriptHeader,
} = require('../scripts/extract-script-info.js');

describe('escapeYamlDoubleQuoted', () => {
  it('escapes quotes and newlines for YAML frontmatter', () => {
    expect(escapeYamlDoubleQuoted('Say "hello"\nworld')).toBe('Say \\"hello\\" world');
  });
});

describe('parseUserscriptHeader', () => {
  it('reads standard userscript metadata', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-script-info-'));
    const filePath = path.join(dir, 'sample.user.js');
    fs.writeFileSync(
      filePath,
      `// ==UserScript==
// @name         Sample Script
// @description  Short description
// @version      1.0.0
// ==/UserScript==
`
    );

    expect(parseUserscriptHeader(filePath)).toEqual({
      name: 'Sample Script',
      description: 'Short description',
      downloadURL: null,
      version: '1.0.0',
      author: null,
      homepage: null,
      supportURL: null,
      license: null,
    });
  });
});

describe('getScriptDescriptionPath', () => {
  it('resolves the sidecar path from slug and src directory', () => {
    const srcDir = '/tmp/src';
    expect(getScriptDescriptionPath('future-roster-printable', srcDir)).toBe(
      path.join(srcDir, `future-roster-printable${SCRIPT_DESCRIPTION_SUFFIX}`)
    );
  });
});

describe('loadScriptAbout', () => {
  it('returns trimmed markdown when the sidecar exists', () => {
    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-script-info-'));
    const slug = 'demo-script';
    fs.writeFileSync(
      getScriptDescriptionPath(slug, srcDir),
      'First paragraph.\n\nSecond paragraph.\n'
    );

    expect(loadScriptAbout(slug, { srcDir, warn: () => {} })).toBe(
      'First paragraph.\n\nSecond paragraph.'
    );
  });

  it('warns and returns null when the sidecar is missing', () => {
    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-script-info-'));
    const warnings = [];
    const about = loadScriptAbout('missing-script', {
      srcDir,
      warn: (message) => warnings.push(message),
    });

    expect(about).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('missing-script.description.md');
  });
});
