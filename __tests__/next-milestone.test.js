// @jest-environment jsdom

const {
  findParkrunTotalHeading,
  findJuniorParkrunTotalHeading,
  findAgeCategory,
  findMostRecentRunDate,
  getNextMilestone,
  getNextMilestoneDefinition,
  getNextSaturday,
  getNextSunday,
  calculateMilestoneDate,
  calculateJuniorMilestoneDate,
  appendMilestoneEstimate,
  appendJuniorMilestoneEstimate,
} = require('../src/next-milestone.user.js');

describe('next-milestone', () => {
  describe('findParkrunTotalHeading', () => {
    it('finds the heading and extracts total', () => {
      document.body.innerHTML = '<h3>443 parkruns total</h3>';
      const result = findParkrunTotalHeading(document);
      expect(result).not.toBeNull();
      expect(result.total).toBe(443);
      expect(result.heading.tagName).toBe('H3');
    });

    it('handles comma-separated totals', () => {
      document.body.innerHTML = '<h3>1,234 parkruns total</h3>';
      const result = findParkrunTotalHeading(document);
      expect(result.total).toBe(1234);
    });

    it('extracts total before junior parkruns text', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const result = findParkrunTotalHeading(document);
      expect(result.total).toBe(77);
    });
  });

  describe('findJuniorParkrunTotalHeading', () => {
    it('extracts junior parkrun total', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const result = findJuniorParkrunTotalHeading(document);
      expect(result).not.toBeNull();
      expect(result.total).toBe(135);
    });

    it('returns null when junior total is missing', () => {
      document.body.innerHTML = '<h3>77 parkruns total</h3>';
      expect(findJuniorParkrunTotalHeading(document)).toBeNull();
    });
  });

  describe('getNextMilestone', () => {
    it('returns the next milestone after the total', () => {
      expect(getNextMilestone(443)).toBe(500);
    });

    it('skips milestones with restricted_age for non-matching category', () => {
      expect(getNextMilestone(1, 'SM25-29')).toBe(25);
    });

    it('includes milestones with restricted_age for matching category', () => {
      expect(getNextMilestone(1, 'J20-24')).toBe(10);
    });

    it('returns next unrestricted milestone when no matching restricted ones exist', () => {
      expect(getNextMilestone(9, 'SM25-29')).toBe(25);
    });
  });

  describe('getNextMilestoneDefinition', () => {
    it('returns milestone definition for the next milestone', () => {
      const milestoneMap = {
        11: { restricted_age: 'J', name: 'Half marathon' },
        250: { restricted_age: 'J', name: 'junior parkrun 250' },
      };
      const result = getNextMilestoneDefinition(135, 'J20-24', milestoneMap);
      expect(result).not.toBeNull();
      expect(result.value).toBe(250);
      expect(result.definition.name).toBe('junior parkrun 250');
    });
  });

  describe('getNextSaturday', () => {
    it('returns today when today is Saturday', () => {
      const saturday = new Date(2026, 1, 7);
      expect(getNextSaturday(saturday).toDateString()).toBe(saturday.toDateString());
    });

    it('returns next Saturday when today is Tuesday', () => {
      const tuesday = new Date(2026, 1, 3);
      const expected = new Date(2026, 1, 7);
      expect(getNextSaturday(tuesday).toDateString()).toBe(expected.toDateString());
    });

    it('returns next week Saturday when today is Saturday and run happened today', () => {
      const saturday = new Date(2026, 1, 7);
      const mostRecentRunDate = new Date(2026, 1, 7);
      const expected = new Date(2026, 1, 14);
      expect(getNextSaturday(saturday, mostRecentRunDate).toDateString()).toBe(
        expected.toDateString()
      );
    });

    it('returns today Saturday when today is Saturday and run did not happen today', () => {
      const saturday = new Date(2026, 1, 7);
      const mostRecentRunDate = new Date(2026, 1, 6);
      expect(getNextSaturday(saturday, mostRecentRunDate).toDateString()).toBe(
        saturday.toDateString()
      );
    });
  });

  describe('getNextSunday', () => {
    it('returns today when today is Sunday', () => {
      const sunday = new Date(2026, 1, 1);
      expect(getNextSunday(sunday).toDateString()).toBe(sunday.toDateString());
    });

    it('returns next Sunday when today is Tuesday', () => {
      const tuesday = new Date(2026, 1, 3);
      const expected = new Date(2026, 1, 8);
      expect(getNextSunday(tuesday).toDateString()).toBe(expected.toDateString());
    });

    it('returns next week Sunday when today is Sunday and run happened today', () => {
      const sunday = new Date(2026, 1, 1);
      const mostRecentRunDate = new Date(2026, 1, 1);
      const expected = new Date(2026, 1, 8);
      expect(getNextSunday(sunday, mostRecentRunDate).toDateString()).toBe(expected.toDateString());
    });
  });

  describe('calculateMilestoneDate', () => {
    it('calculates milestone date based on weekly Saturdays', () => {
      const startDate = new Date(2026, 1, 3);
      const result = calculateMilestoneDate(443, 500, startDate);
      const expected = new Date(2027, 2, 6);
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it('returns today when milestone is reached on a Saturday', () => {
      const startDate = new Date(2026, 1, 7); // Saturday
      const result = calculateMilestoneDate(499, 500, startDate);
      expect(result.toDateString()).toBe(startDate.toDateString());
    });

    it('accounts for most recent run when today is Saturday', () => {
      const startDate = new Date(2026, 1, 7); // Saturday
      const mostRecentRunDate = new Date(2026, 1, 7); // ran today
      const result = calculateMilestoneDate(9, 10, startDate, mostRecentRunDate);
      const expected = new Date(2026, 1, 14);
      expect(result.toDateString()).toBe(expected.toDateString());
    });
  });

  describe('calculateJuniorMilestoneDate', () => {
    it('calculates milestone date based on weekly Sundays', () => {
      const startDate = new Date(2026, 1, 3);
      const result = calculateJuniorMilestoneDate(135, 250, startDate);
      const expected = new Date(2028, 3, 16);
      expect(result.toDateString()).toBe(expected.toDateString());
    });
  });

  describe('appendMilestoneEstimate', () => {
    it('appends milestone estimate once', () => {
      document.body.innerHTML = '<h3>443 parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendMilestoneEstimate(heading, 500, 'Friday, March 6, 2027');
      appendMilestoneEstimate(heading, 500, 'Friday, March 6, 2027');
      expect(heading.textContent).toContain('expected to reach 500 around Friday, March 6, 2027');
      const occurrences = heading.textContent.match(/expected to reach 500/g) || [];
      expect(occurrences.length).toBe(1);
    });

    it('inserts milestone estimate before ampersand', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendMilestoneEstimate(heading, 100, 'Friday, April 4, 2026');
      expect(heading.textContent).toContain(
        '77 parkruns (expected to reach 100 around Friday, April 4, 2026) & 135 junior parkruns total'
      );
    });
  });

  describe('appendJuniorMilestoneEstimate', () => {
    it('appends junior milestone estimate once', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendJuniorMilestoneEstimate(heading, 'junior parkrun 250', 'Sunday, July 11, 2026');
      appendJuniorMilestoneEstimate(heading, 'junior parkrun 250', 'Sunday, July 11, 2026');
      expect(heading.textContent).toContain(
        'expected to reach junior parkrun 250 around Sunday, July 11, 2026'
      );
      const occurrences = heading.textContent.match(/junior parkrun 250/g) || [];
      expect(occurrences.length).toBe(1);
    });
  });

  describe('findAgeCategory', () => {
    it('extracts age category from page', () => {
      document.body.innerHTML = `
        <p>Some text</p>
        <p>Most recent age category was SM25-29</p>
      `;
      expect(findAgeCategory(document)).toBe('SM25-29');
    });

    it('returns null if age category not found', () => {
      document.body.innerHTML = '<p>Some text</p>';
      expect(findAgeCategory(document)).toBeNull();
    });

    it('handles junior age categories', () => {
      document.body.innerHTML = '<p>Most recent age category was J20-24</p>';
      expect(findAgeCategory(document)).toBe('J20-24');
    });
  });

  describe('findMostRecentRunDate', () => {
    it('extracts most recent run date from results table', () => {
      document.body.innerHTML = `
        <table id="results">
          <tbody>
            <tr>
              <td><a href="">Event</a></td>
              <td><a href="">31/01/2026</a></td>
              <td>Other</td>
            </tr>
          </tbody>
        </table>
      `;
      const result = findMostRecentRunDate(document);
      expect(result).not.toBeNull();
      expect(result.toDateString()).toBe(new Date(2026, 0, 31).toDateString());
    });

    it('returns null if no results table', () => {
      document.body.innerHTML = '<div></div>';
      expect(findMostRecentRunDate(document)).toBeNull();
    });

    it('returns null if no rows in table', () => {
      document.body.innerHTML = '<table id="results"><tbody></tbody></table>';
      expect(findMostRecentRunDate(document)).toBeNull();
    });
  });
});
