// @jest-environment jsdom

const {
  BAR_ID,
  parseResultsPath,
  isSingleEventResultsPath,
  extractEventMetadata,
  formatEventDateAustralian,
  buildEventResultsUrl,
  isPageReady,
  shouldSuppressKeyboardShortcut,
  createCentreLabel,
  createNavigationBar,
  renderNavigationBar,
  init,
} = require('../src/event-results-navigation.user.js');

const sampleH3 =
  '<h3><span class="format-date">15/6/2024</span><span class="spacer"> | </span><span>#400</span></h3>';

function setupResultsPage(pathname = '/coburg/results/400/') {
  document.body.innerHTML = `${sampleH3}<table class="Results-table"></table>`;
  return pathname;
}

describe('parseResultsPath', () => {
  it('parses event-number URLs', () => {
    expect(parseResultsPath('/coburg/results/400/')).toEqual({
      location: 'coburg',
      segmentType: 'number',
      eventNumber: 400,
    });
  });

  it('parses date URLs', () => {
    expect(parseResultsPath('/coburg/results/2024-06-15/')).toEqual({
      location: 'coburg',
      segmentType: 'date',
    });
  });

  it('parses latestresults URLs', () => {
    expect(parseResultsPath('/coburg/results/latestresults/')).toEqual({
      location: 'coburg',
      segmentType: 'latest',
    });
  });

  it('parses junior location URLs', () => {
    expect(parseResultsPath('/westerfolds-juniors/results/50/')).toEqual({
      location: 'westerfolds-juniors',
      segmentType: 'number',
      eventNumber: 50,
    });
  });

  it('returns null for event history', () => {
    expect(parseResultsPath('/coburg/results/eventhistory/')).toBeNull();
  });

  it('returns null for unrelated paths', () => {
    expect(parseResultsPath('/coburg/futureroster/')).toBeNull();
  });
});

describe('isSingleEventResultsPath', () => {
  it('returns true for in-scope results paths', () => {
    expect(isSingleEventResultsPath('/coburg/results/latestresults/')).toBe(true);
  });

  it('returns false for out-of-scope paths', () => {
    expect(isSingleEventResultsPath('/coburg/results/eventhistory/')).toBe(false);
  });
});

describe('extractEventMetadata', () => {
  it('reads event number and date from the heading', () => {
    document.body.innerHTML = sampleH3;
    expect(extractEventMetadata(document)).toEqual({
      eventNumber: 400,
      rawDate: '15/6/2024',
    });
  });

  it('returns null when event number is missing', () => {
    document.body.innerHTML =
      '<h3><span class="format-date">15/6/2024</span><span class="spacer"> | </span></h3>';
    expect(extractEventMetadata(document)).toBeNull();
  });
});

describe('formatEventDateAustralian', () => {
  it('formats D/M/YYYY dates', () => {
    expect(formatEventDateAustralian('15/6/2024')).toBe('15 Jun 2024');
  });

  it('formats two-digit years', () => {
    expect(formatEventDateAustralian('1/2/24')).toBe('1 Feb 2024');
  });

  it('returns the original string when parsing fails', () => {
    expect(formatEventDateAustralian('not a date')).toBe('not a date');
  });
});

describe('buildEventResultsUrl', () => {
  it('builds event-number URLs', () => {
    expect(buildEventResultsUrl('https://www.parkrun.com.au', 'coburg', 401)).toBe(
      'https://www.parkrun.com.au/coburg/results/401/'
    );
  });
});

describe('isPageReady', () => {
  it('requires both heading metadata and a results table', () => {
    document.body.innerHTML = sampleH3;
    expect(isPageReady(document)).toBe(false);

    document.body.innerHTML = `${sampleH3}<table class="Results-table"></table>`;
    expect(isPageReady(document)).toBe(true);
  });
});

describe('shouldSuppressKeyboardShortcut', () => {
  it('suppresses shortcuts in editable fields', () => {
    const input = document.createElement('input');
    expect(shouldSuppressKeyboardShortcut(input)).toBe(true);
  });

  it('allows shortcuts elsewhere', () => {
    const div = document.createElement('div');
    expect(shouldSuppressKeyboardShortcut(div)).toBe(false);
  });
});

describe('createCentreLabel', () => {
  it('wraps the event label in bracketed keyboard hints', () => {
    const centre = createCentreLabel(document, 400, '15 Jun 2024');
    const kbds = centre.querySelectorAll('kbd');

    expect(centre.textContent).toBe('[ #400 · 15 Jun 2024 ]');
    expect(kbds).toHaveLength(2);
    expect(kbds[0].textContent).toBe('[');
    expect(kbds[1].textContent).toBe(']');
    expect(kbds[0].title).toBe('Go to previous event');
    expect(kbds[1].title).toBe('Go to next event');
    expect(kbds[0].getAttribute('aria-label')).toContain('previous event');
    expect(kbds[1].getAttribute('aria-label')).toContain('next event');
  });
});

describe('createNavigationBar', () => {
  it('renders previous, centre, and next controls', () => {
    const bar = createNavigationBar({
      origin: 'https://www.parkrun.com.au',
      location: 'coburg',
      eventNumber: 400,
      formattedDate: '15 Jun 2024',
      doc: document,
    });

    expect(bar.id).toBe(BAR_ID);
    expect(bar.querySelector('.parkrun-event-nav-previous').textContent).toBe(
      'Previous event (#399)'
    );
    expect(bar.querySelector('.parkrun-event-nav-next').href).toBe(
      'https://www.parkrun.com.au/coburg/results/401/'
    );
    expect(bar.textContent).toContain('[ #400 · 15 Jun 2024 ]');
  });

  it('disables previous navigation on event #1', () => {
    const bar = createNavigationBar({
      origin: 'https://www.parkrun.com.au',
      location: 'coburg',
      eventNumber: 1,
      formattedDate: '31 Jan 2008',
      doc: document,
    });

    const previous = bar.querySelector('.parkrun-event-nav-previous');
    expect(previous.tagName).toBe('SPAN');
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    expect(bar.querySelector('.parkrun-event-nav-next').href).toContain('/results/2/');
  });
});

describe('renderNavigationBar', () => {
  it('inserts the bar and offsets page content', () => {
    const pathname = setupResultsPage();

    const bar = renderNavigationBar({
      pathname,
      origin: 'https://www.parkrun.com.au',
      document,
    });

    expect(bar).not.toBeNull();
    expect(document.getElementById(BAR_ID)).toBe(bar);
    expect(document.body.style.paddingTop).not.toBe('');
  });

  it('returns null on out-of-scope paths', () => {
    setupResultsPage('/coburg/results/eventhistory/');
    expect(
      renderNavigationBar({
        pathname: '/coburg/results/eventhistory/',
        origin: 'https://www.parkrun.com.au',
        document,
      })
    ).toBeNull();
  });

  it('returns null before the page is ready', () => {
    document.body.innerHTML = sampleH3;
    expect(
      renderNavigationBar({
        pathname: '/coburg/results/400/',
        origin: 'https://www.parkrun.com.au',
        document,
      })
    ).toBeNull();
  });
});

describe('init', () => {
  it('renders immediately when the page is already ready', () => {
    const pathname = setupResultsPage('/coburg/results/latestresults/');
    init({
      pathname,
      origin: 'https://www.parkrun.com.au',
      document,
    });

    expect(document.getElementById(BAR_ID)).not.toBeNull();
  });

  it('waits for the results table before rendering', async () => {
    document.body.innerHTML = sampleH3;
    init({
      pathname: '/coburg/results/400/',
      origin: 'https://www.parkrun.com.au',
      document,
    });

    expect(document.getElementById(BAR_ID)).toBeNull();

    const table = document.createElement('table');
    table.className = 'Results-table';
    document.body.appendChild(table);

    await new Promise((resolve) => {
      const check = () => {
        if (document.getElementById(BAR_ID)) {
          resolve();
          return;
        }
        setTimeout(check, 0);
      };
      check();
    });

    expect(document.getElementById(BAR_ID)).not.toBeNull();
  });

  it('does nothing on out-of-scope paths', () => {
    setupResultsPage('/coburg/results/eventhistory/');
    init({
      pathname: '/coburg/results/eventhistory/',
      origin: 'https://www.parkrun.com.au',
      document,
    });

    expect(document.getElementById(BAR_ID)).toBeNull();
  });
});
