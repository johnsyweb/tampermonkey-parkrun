// @jest-environment jsdom

const {
  findConsolidatedClubLink,
  extractClubNumFromLink,
  getMostRecentSunday,
  formatDateYYYYMMDD,
  buildSundayLink,
} = require('../src/junior-group-sunday-link.user.js');

describe('findConsolidatedClubLink', () => {
  it('finds the correct link', () => {
    document.body.innerHTML = `
      <a href="/results/consolidatedclub/?clubNum=12345">Consolidated</a>
      <a href="/other">Other</a>
    `;
    const link = findConsolidatedClubLink(document);
    expect(link).not.toBeNull();
    expect(link.href).toContain('/results/consolidatedclub/?clubNum=12345');
  });
  it('returns null if not found', () => {
    document.body.innerHTML = `<a href="/other">Other</a>`;
    expect(findConsolidatedClubLink(document)).toBeNull();
  });
});

describe('extractClubNumFromLink', () => {
  it('extracts clubNum from link', () => {
    const a = document.createElement('a');
    a.href = 'https://www.parkrun.com/results/consolidatedclub/?clubNum=67890';
    expect(extractClubNumFromLink(a)).toBe('67890');
  });
  it('returns null for invalid link', () => {
    const a = document.createElement('a');
    a.href = 'not a url';
    expect(extractClubNumFromLink(a)).toBeNull();
  });
});

describe('getMostRecentSunday', () => {
  it('returns today if today is Sunday', () => {
    const d = new Date('2026-02-01'); // Sunday
    expect(getMostRecentSunday(d).toISOString().slice(0, 10)).toBe('2026-02-01');
  });
  it('returns previous Sunday for Monday', () => {
    const d = new Date('2026-02-02'); // Monday
    expect(getMostRecentSunday(d).toISOString().slice(0, 10)).toBe('2026-02-01');
  });
  it('returns previous Sunday for Wednesday', () => {
    const d = new Date('2026-02-04'); // Wednesday
    expect(getMostRecentSunday(d).toISOString().slice(0, 10)).toBe('2026-02-01');
  });
});

describe('formatDateYYYYMMDD', () => {
  it('formats date as yyyy-mm-dd', () => {
    const d = new Date('2026-02-01');
    expect(formatDateYYYYMMDD(d)).toBe('2026-02-01');
  });
});

describe('buildSundayLink', () => {
  it('creates a new link with correct href and text', () => {
    const a = document.createElement('a');
    a.href = 'https://www.parkrun.com/results/consolidatedclub/?clubNum=12345';
    a.textContent = 'Original';
    const newLink = buildSundayLink(a, '12345', '2026-02-01');
    expect(newLink.href).toContain('eventdate=2026-02-01');
    expect(newLink.textContent).toMatch(/last Sunday's junior parkruns/);
  });
});
