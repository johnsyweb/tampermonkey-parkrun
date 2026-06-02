// @jest-environment jsdom

const fs = require('fs');
const path = require('path');
const {
  STYLE_ID,
  CORE_ROLES_EXPLANATION_ID,
  CORE_ROLE_FOOTNOTE_MARKER,
  DEFAULT_CORE_ROLES_EXPLANATION,
  PREPARE_BUTTON_ID,
  PREPARE_BUTTON_LABEL,
  PREPARE_CONTROL_ID,
  PREPARE_CONTROL_STYLE_ID,
  PREPARE_HELPER_TEXT,
  PERSISTENCE_ERROR_ID,
  RESET_BUTTON_ID,
  buildStorageKey,
  buildControlStyles,
  buildSupplementalStyles,
  createCoreRolesExplanation,
  enableCellEditing,
  findRosterTable,
  findRosterTableStyles,
  getPrintableTitle,
  injectPrepareControl,
  injectSupplementalStyles,
  isolateMainForPrint,
  markCoreRoleRows,
  prepareForPrinting,
  restorePersistedEdits,
  savePersistedEdits,
  preserveRosterTableStyles,
  resetPersistedEdits,
} = require('../src/future-roster-printable.user.js');

const FIXTURE_PATH = path.join(
  __dirname,
  '../test-data/future roster | Albert parkrun, Melbourne.html'
);

function parseFixtureHtml(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function setupSampleRosterPage() {
  document.body.innerHTML = `
    <header id="mainheader">Navigation</header>
    <main id="page">
      <div id="main">
        <div id="mainleft">
          <h1>Sample Event Future volunteer roster</h1>
          <p>Intro text</p>
          <div id="viewroster">
            <table id="rosterTable">
              <tbody>
                <tr><th class="corerole">Run Director</th><td>Pat</td></tr>
                <tr><th>Marshal</th><td>Sam</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
    <footer>Footer</footer>
  `;
  document.title = 'future roster | Sample Event';
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

describe('findRosterTable', () => {
  it('finds the table inside #viewroster', () => {
    document.body.innerHTML = `
      <div id="main">
        <div id="viewroster"><table id="rosterTable"><tr><td>Role</td></tr></table></div>
      </div>
    `;
    const table = findRosterTable(document.getElementById('main'));
    expect(table?.id).toBe('rosterTable');
  });

  it('returns null when no table exists', () => {
    document.body.innerHTML = '<div id="main"><p>No table</p></div>';
    expect(findRosterTable(document.getElementById('main'))).toBeNull();
  });
});

describe('findRosterTableStyles', () => {
  it('finds inline style blocks inside #viewroster', () => {
    document.body.innerHTML = `
      <div id="main">
        <div id="viewroster">
          <style>table#rosterTable td { border: 1px solid black; }</style>
          <table id="rosterTable"></table>
        </div>
      </div>
    `;
    const styles = findRosterTableStyles(document.getElementById('main'));
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('border: 1px solid black');
  });
});

describe('preserveRosterTableStyles', () => {
  it('moves #viewroster style blocks into the document head', () => {
    document.body.innerHTML = `
      <div id="main">
        <div id="viewroster">
          <style id="rosterStyle">table#rosterTable td { border: 1px solid black; }</style>
          <table id="rosterTable"></table>
        </div>
      </div>
    `;
    document.head.innerHTML = '';
    preserveRosterTableStyles(document, document.getElementById('main'));
    expect(document.getElementById('rosterStyle')?.parentElement).toBe(document.head);
  });
});

describe('enableCellEditing', () => {
  it('makes every table cell editable and keyboard focusable', () => {
    document.body.innerHTML = `
      <table id="rosterTable">
        <thead><tr><th>Role</th><th>Date</th></tr></thead>
        <tbody><tr><th>Marshal</th><td>Pat</td></tr></tbody>
      </table>
    `;
    enableCellEditing(document.getElementById('rosterTable'));
    document.querySelectorAll('#rosterTable td, #rosterTable th').forEach((cell) => {
      expect(cell.getAttribute('contenteditable')).toBe('true');
      expect(cell.getAttribute('tabindex')).toBe('0');
    });
  });
});

describe('markCoreRoleRows', () => {
  it('marks rows with th.corerole as core roles', () => {
    document.body.innerHTML = `
      <table id="rosterTable">
        <tbody>
          <tr><th class="corerole">Run Director</th><td>Pat</td></tr>
          <tr><th>Marshal</th><td>Sam</td></tr>
        </tbody>
      </table>
    `;
    markCoreRoleRows(document.getElementById('rosterTable'));
    expect(document.querySelector('#rosterTable tr.core-role th.corerole')).not.toBeNull();
    expect(document.querySelectorAll('#rosterTable tr.core-role')).toHaveLength(1);
  });
});

describe('createCoreRolesExplanation', () => {
  it('creates an editable explanation with default text', () => {
    const explanation = createCoreRolesExplanation(document);
    expect(explanation.id).toBe(CORE_ROLES_EXPLANATION_ID);
    expect(explanation.getAttribute('contenteditable')).toBe('true');
    expect(explanation.getAttribute('tabindex')).toBe('0');
    expect(explanation.textContent).toBe(DEFAULT_CORE_ROLES_EXPLANATION);
    expect(explanation.textContent).toContain(CORE_ROLE_FOOTNOTE_MARKER);
    expect(explanation.textContent).toContain('covered');
    expect(explanation.textContent).not.toContain('filled');
  });
});

describe('buildControlStyles', () => {
  it('styles the prepare control as a prominent call to action', () => {
    const css = buildControlStyles();
    expect(css).toContain(`#${PREPARE_BUTTON_ID}`);
    expect(css).toContain('#4c1a57');
  });
});

describe('injectPrepareControl', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('returns false when #main is missing', () => {
    document.body.innerHTML = '<p>No main element</p>';
    expect(injectPrepareControl(document)).toBe(false);
    expect(document.getElementById(PREPARE_CONTROL_ID)).toBeNull();
  });

  it('returns false when #main has no roster table', () => {
    document.body.innerHTML = '<div id="main"><h1>Event</h1><p>Intro only</p></div>';
    expect(injectPrepareControl(document)).toBe(false);
    expect(document.getElementById(PREPARE_CONTROL_ID)).toBeNull();
  });

  it('inserts the prepare control immediately before #viewroster', () => {
    setupSampleRosterPage();
    expect(injectPrepareControl(document)).toBe(true);

    const viewroster = document.getElementById('viewroster');
    expect(viewroster.previousElementSibling.id).toBe(PREPARE_CONTROL_ID);

    const button = document.getElementById(PREPARE_BUTTON_ID);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.textContent).toBe(PREPARE_BUTTON_LABEL);

    const helper = document.getElementById(PREPARE_CONTROL_ID).querySelector('p');
    expect(helper.textContent).toBe(PREPARE_HELPER_TEXT);

    expect(document.getElementById('main')).not.toBeNull();
    expect(document.getElementById('mainheader')).not.toBeNull();
    expect(document.getElementById(STYLE_ID)).toBeNull();
    expect(document.querySelector('#rosterTable td')?.getAttribute('contenteditable')).toBeNull();
    expect(document.getElementById(PREPARE_CONTROL_STYLE_ID)).not.toBeNull();
  });

  it('does not inject duplicate controls when called twice', () => {
    setupSampleRosterPage();
    injectPrepareControl(document);
    injectPrepareControl(document);
    expect(document.querySelectorAll(`#${PREPARE_CONTROL_ID}`)).toHaveLength(1);
  });

  it('leaves the Albert Melbourne fixture intact', () => {
    const html = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const doc = parseFixtureHtml(html);

    expect(injectPrepareControl(doc)).toBe(true);
    expect(doc.getElementById('main')).not.toBeNull();
    expect(doc.getElementById('mainheader')).not.toBeNull();
    expect(doc.getElementById('viewroster')).not.toBeNull();
    expect(doc.getElementById('viewroster').previousElementSibling.id).toBe(PREPARE_CONTROL_ID);
    expect(doc.getElementById(STYLE_ID)).toBeNull();
  });
});

describe('prepareForPrinting', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.scrollTo = jest.fn();
    window.localStorage.clear();
  });

  it('returns false when the roster table is missing', () => {
    document.body.innerHTML = '<div id="main"><p>No table</p></div>';
    expect(prepareForPrinting(document)).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('transforms the page, removes the prepare control, and scrolls to top', () => {
    setupSampleRosterPage();
    injectPrepareControl(document);

    expect(prepareForPrinting(document)).toBe(true);

    expect(document.getElementById(PREPARE_CONTROL_ID)).toBeNull();
    expect(document.getElementById('rosterTable')).not.toBeNull();
    expect(document.getElementById(CORE_ROLES_EXPLANATION_ID)).not.toBeNull();
    expect(document.getElementById('main')).toBeNull();
    expect(document.getElementById(STYLE_ID)).not.toBeNull();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('transforms when the prepare button is clicked', () => {
    setupSampleRosterPage();
    injectPrepareControl(document);

    document.getElementById(PREPARE_BUTTON_ID).click();

    expect(document.getElementById(PREPARE_CONTROL_ID)).toBeNull();
    expect(document.getElementById('rosterTable')).not.toBeNull();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('persistence', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('builds storage keys from slug and tld', () => {
    expect(buildStorageKey('loganriver', 'com.au')).toBe(
      'parkrun-future-roster-printable:loganriver|com.au'
    );
  });

  it('saves role headers and explanation text', () => {
    setupSampleRosterPage();
    prepareForPrinting(document);
    const table = document.getElementById('rosterTable');
    table.querySelectorAll('tbody tr th')[0].textContent = 'Run Director (A)';
    table.querySelectorAll('tbody tr th')[1].textContent = 'Marshal 100m';
    document.getElementById(CORE_ROLES_EXPLANATION_ID).textContent = 'Custom explanation';

    savePersistedEdits(document);

    const key = Object.keys(window.localStorage)[0];
    const payload = JSON.parse(window.localStorage.getItem(key));
    expect(payload.headers).toHaveLength(2);
    expect(payload.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 0,
          originalText: 'Run Director',
          value: 'Run Director (A)',
        }),
        expect.objectContaining({ rowIndex: 1, originalText: 'Marshal', value: 'Marshal 100m' }),
      ])
    );
    expect(payload.explanation).toBe('Custom explanation');
  });

  it('does not persist unedited headers', () => {
    setupSampleRosterPage();
    prepareForPrinting(document);
    savePersistedEdits(document);

    const key = Object.keys(window.localStorage)[0];
    const payload = JSON.parse(window.localStorage.getItem(key));
    expect(payload.headers).toHaveLength(0);
  });

  it('restores persisted headers and explanation when original text matches', () => {
    setupSampleRosterPage();
    prepareForPrinting(document);
    savePersistedEdits(document);
    const key = Object.keys(window.localStorage)[0];
    window.localStorage.setItem(
      key,
      JSON.stringify({
        headers: [
          { rowIndex: 0, originalText: 'Run Director', value: 'Run Director (A)' },
          { rowIndex: 1, originalText: 'Marshal', value: 'Marshal 100m' },
        ],
        explanation: 'Saved explanation',
      })
    );

    restorePersistedEdits(document);

    const headers = Array.from(document.querySelectorAll('#rosterTable tbody tr th')).map((th) =>
      th.textContent.trim()
    );
    expect(headers[0]).toContain('Run Director (A)');
    expect(headers[1]).toContain('Marshal 100m');
    expect(document.getElementById(CORE_ROLES_EXPLANATION_ID).textContent).toBe(
      'Saved explanation'
    );
  });

  it('reset clears saved values and restores defaults', () => {
    setupSampleRosterPage();
    prepareForPrinting(document);
    const table = document.getElementById('rosterTable');
    table.querySelectorAll('tbody tr th')[1].textContent = 'Marshal 100m';
    document.getElementById(CORE_ROLES_EXPLANATION_ID).textContent = 'Saved explanation';
    savePersistedEdits(document);

    resetPersistedEdits(document);

    expect(Object.keys(window.localStorage)).toHaveLength(0);
    const headers = Array.from(document.querySelectorAll('#rosterTable tbody tr th')).map((th) =>
      th.textContent.trim()
    );
    expect(headers[1]).toContain('Marshal');
    expect(document.getElementById(CORE_ROLES_EXPLANATION_ID).textContent).toBe(
      DEFAULT_CORE_ROLES_EXPLANATION
    );
  });

  it('renders a reset button and error region in printable mode', () => {
    setupSampleRosterPage();
    prepareForPrinting(document);
    expect(document.getElementById(RESET_BUTTON_ID)).not.toBeNull();
    expect(document.getElementById(PERSISTENCE_ERROR_ID)).not.toBeNull();
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
    expect(css).toContain('table {\n  width: 100%;');
    expect(css).toContain('border: 1px solid black');
    expect(css).toContain('tr.core-role th.corerole');
    expect(css).toContain("content: ' *'");
    expect(css).toContain('.core-roles-explanation');
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

  it('returns false when #main has no roster table', () => {
    document.body.innerHTML = '<div id="main"><h1>Event</h1><p>Intro only</p></div>';
    expect(isolateMainForPrint(document)).toBe(false);
  });

  it('isolates the roster table, injects styles, and sets title from h1', () => {
    setupSampleRosterPage();

    expect(isolateMainForPrint(document)).toBe(true);
    expect(document.body.children).toHaveLength(2);
    expect(document.body.firstElementChild.tagName).toBe('TABLE');
    expect(document.body.firstElementChild.id).toBe('rosterTable');
    expect(
      document.getElementById(CORE_ROLES_EXPLANATION_ID)?.getAttribute('contenteditable')
    ).toBe('true');
    expect(document.querySelector('#rosterTable tr.core-role')).not.toBeNull();
    expect(document.getElementById('main')).toBeNull();
    expect(document.getElementById('viewroster')).toBeNull();
    expect(document.getElementById(STYLE_ID)).not.toBeNull();
    expect(document.querySelector('#rosterTable td')?.getAttribute('contenteditable')).toBe('true');
    expect(document.title).toBe('Sample Event Future volunteer roster');
  });

  it('works against the Albert Melbourne fixture', () => {
    const html = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const doc = parseFixtureHtml(html);

    expect(isolateMainForPrint(doc)).toBe(true);
    expect(doc.body.children).toHaveLength(2);
    expect(doc.body.firstElementChild.id).toBe('rosterTable');
    expect(doc.getElementById(CORE_ROLES_EXPLANATION_ID)?.textContent).toBe(
      DEFAULT_CORE_ROLES_EXPLANATION
    );
    expect(doc.querySelectorAll('#rosterTable tr.core-role').length).toBeGreaterThan(0);
    expect(doc.getElementById('mainheader')).toBeNull();
    expect(doc.getElementById('main')).toBeNull();
    expect(doc.getElementById('viewroster')).toBeNull();
    expect(doc.getElementById(STYLE_ID)).not.toBeNull();
    expect(
      Array.from(doc.head.querySelectorAll('style')).some((style) =>
        style.textContent.includes('border: 1px solid black')
      )
    ).toBe(true);
    expect(doc.querySelectorAll('#rosterTable td, #rosterTable th')).not.toHaveLength(0);
    doc.querySelectorAll('#rosterTable td, #rosterTable th').forEach((cell) => {
      expect(cell.getAttribute('contenteditable')).toBe('true');
    });
    expect(doc.title).toBe('Albert parkrun, Melbourne Future volunteer roster');
  });
});
