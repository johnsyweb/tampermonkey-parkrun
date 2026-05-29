// @jest-environment jsdom

const fs = require('fs');
const path = require('path');
const {
  STYLE_ID,
  buildSupplementalStyles,
  getPrintableTitle,
  injectSupplementalStyles,
  isolateMainForPrint,
} = require('../src/future-roster-printable.user.js');

const FIXTURE_PATH = path.join(
  __dirname,
  '../test-data/future roster | Albert parkrun, Melbourne.html'
);

function parseFixtureHtml(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

describe('getPrintableTitle', () => {
  it('returns trimmed h1 text from main', () => {
    document.body.innerHTML = `
      <div id="main">
        <h1>  Albert parkrun, Melbourne Future volunteer roster  </h1>
      </div>
    `;
    expect(getPrintableTitle(document.getElementById('main'), 'fallback')).toBe(
      'Albert parkrun, Melbourne Future volunteer roster'
    );
  });

  it('falls back when h1 is missing', () => {
    document.body.innerHTML = '<div id="main"><p>No heading</p></div>';
    expect(getPrintableTitle(document.getElementById('main'), 'future roster | event')).toBe(
      'future roster | event'
    );
  });
});

describe('buildSupplementalStyles', () => {
  it('includes landscape A4 page rules and print link styling', () => {
    const css = buildSupplementalStyles();
    expect(css).toContain('size: A4 landscape');
    expect(css).toContain('margin: 10mm');
    expect(css).toContain('a[href]::after');
    expect(css).toContain('break-inside: avoid');
    expect(css).toContain('background: #fff');
  });
});

describe('injectSupplementalStyles', () => {
  it('adds the stylesheet once', () => {
    document.head.innerHTML = '';
    injectSupplementalStyles(document);
    injectSupplementalStyles(document);
    expect(document.querySelectorAll(`#${STYLE_ID}`)).toHaveLength(1);
  });
});

describe('isolateMainForPrint', () => {
  it('returns false when #main is missing', () => {
    document.body.innerHTML = '<p>No main element</p>';
    expect(isolateMainForPrint(document)).toBe(false);
  });

  it('isolates #main, injects styles, and sets title from h1', () => {
    document.body.innerHTML = `
      <header id="mainheader">Navigation</header>
      <main id="page">
        <div id="main">
          <div id="mainleft">
            <h1>Sample Event Future volunteer roster</h1>
            <div id="viewroster"><table><tr><td>Role</td></tr></table></div>
          </div>
        </div>
      </main>
      <footer>Footer</footer>
    `;
    document.title = 'future roster | Sample Event';

    expect(isolateMainForPrint(document)).toBe(true);
    expect(document.body.children).toHaveLength(1);
    expect(document.body.firstElementChild.id).toBe('main');
    expect(document.getElementById('viewroster')).not.toBeNull();
    expect(document.getElementById(STYLE_ID)).not.toBeNull();
    expect(document.title).toBe('Sample Event Future volunteer roster');
  });

  it('works against the Albert Melbourne fixture', () => {
    const html = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const doc = parseFixtureHtml(html);

    expect(isolateMainForPrint(doc)).toBe(true);
    expect(doc.body.children).toHaveLength(1);
    expect(doc.body.firstElementChild.id).toBe('main');
    expect(doc.getElementById('mainheader')).toBeNull();
    expect(doc.getElementById('viewroster')).not.toBeNull();
    expect(doc.getElementById(STYLE_ID)).not.toBeNull();
    expect(doc.title).toBe('Albert parkrun, Melbourne Future volunteer roster');
  });
});
