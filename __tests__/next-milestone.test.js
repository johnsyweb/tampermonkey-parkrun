// @jest-environment jsdom

const {
  findParkrunTotalHeading,
  findJuniorParkrunTotalHeading,
  findAgeCategory,
  findVolunteerDaysTotal,
  findMostRecentFinishDate,
  getNextMilestone,
  getNextMilestoneDefinition,
  getNextSaturday,
  getNextSunday,
  calculateMilestoneDate,
  calculateJuniorMilestoneDate,
  appendMilestoneEstimate,
  appendJuniorMilestoneEstimate,
  appendVolunteerDaysSummary,
  getVolunteerDayPreferences,
  setVolunteerDayPreferences,
  getNextVolunteerMilestoneDate,
  isDateInNextWeek,
  highlightDateIfNeeded,
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

  describe('appendVolunteerDaysSummary', () => {
    it('adds volunteer days summary under heading once', () => {
      document.body.innerHTML = '<h3>77 parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendVolunteerDaysSummary(heading, 317);
      appendVolunteerDaysSummary(heading, 317);
      expect(heading.nextElementSibling?.textContent).toBe('317 volunteer days total');
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

  describe('findVolunteerDaysTotal', () => {
    it('extracts total volunteer days from summary table', () => {
      document.body.innerHTML = `
        <h3 id="volunteer-summary">Volunteer Summary</h3>
        <table id="results">
          <tfoot>
            <tr>
              <td><strong>Total Credits</strong></td>
              <td><strong>317</strong></td>
            </tr>
          </tfoot>
        </table>
      `;
      expect(findVolunteerDaysTotal(document)).toBe(317);
    });

    it('returns null when volunteer summary is missing', () => {
      document.body.innerHTML = '<div></div>';
      expect(findVolunteerDaysTotal(document)).toBeNull();
    });
  });

  describe('findMostRecentFinishDate', () => {
    it('extracts most recent finish date from results table', () => {
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
      const result = findMostRecentFinishDate(document);
      expect(result).not.toBeNull();
      expect(result.toDateString()).toBe(new Date(2026, 0, 31).toDateString());
    });

    it('returns null if no results table', () => {
      document.body.innerHTML = '<div></div>';
      expect(findMostRecentFinishDate(document)).toBeNull();
    });

    it('returns null if no rows in table', () => {
      document.body.innerHTML = '<table id="results"><tbody></tbody></table>';
      expect(findMostRecentFinishDate(document)).toBeNull();
    });
  });

  describe('getVolunteerDayPreferences', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('returns default preferences when none are stored', () => {
      const prefs = getVolunteerDayPreferences();
      expect(prefs).toEqual({ saturday: true, sunday: true });
    });

    it('retrieves stored preferences', () => {
      setVolunteerDayPreferences({ saturday: true, sunday: false });
      const prefs = getVolunteerDayPreferences();
      expect(prefs).toEqual({ saturday: true, sunday: false });
    });

    it('returns default preferences if stored data is invalid', () => {
      localStorage.setItem('parkrun-volunteer-days', 'invalid json');
      const prefs = getVolunteerDayPreferences();
      expect(prefs).toEqual({ saturday: true, sunday: true });
    });
  });

  describe('getNextVolunteerMilestoneDate', () => {
    it('returns next milestone date for Saturday-only volunteering', () => {
      const startDate = new Date(2026, 1, 3); // Tuesday, Feb 3, 2026
      const targetDate = getNextVolunteerMilestoneDate(77, 100, startDate, {
        saturday: true,
        sunday: false,
      });
      expect(targetDate).not.toBeNull();
      expect(targetDate.getDay()).toBe(6); // Saturday
      // 23 volunteers needed, starting Saturday Feb 7, + 22 more weeks
      const expected = new Date(2026, 6, 11); // Saturday, July 11, 2026
      expect(targetDate.toDateString()).toBe(expected.toDateString());
    });

    it('returns next milestone date for Sunday-only volunteering', () => {
      const startDate = new Date(2026, 1, 3); // Tuesday, Feb 3, 2026
      const targetDate = getNextVolunteerMilestoneDate(77, 100, startDate, {
        saturday: false,
        sunday: true,
      });
      expect(targetDate).not.toBeNull();
      expect(targetDate.getDay()).toBe(0); // Sunday
      // 23 volunteers needed, starting Sunday Feb 8, + 22 more weeks
      const expected = new Date(2026, 6, 12); // Sunday, July 12, 2026
      expect(targetDate.toDateString()).toBe(expected.toDateString());
    });

    it('returns earlier date when both Saturday and Sunday volunteering', () => {
      const startDate = new Date(2026, 1, 3); // Tuesday, Feb 3, 2026
      const targetDate = getNextVolunteerMilestoneDate(77, 100, startDate, {
        saturday: true,
        sunday: true,
      });
      expect(targetDate).not.toBeNull();
      // 23 volunteers needed, 2 per week = 11 complete weeks (22 volunteers) + 1 more
      // Next Saturday is Feb 7 (first day)
      // After 11 weeks (77 days): April 25, 2026 (Saturday) = 23rd volunteer
      const expected = new Date(2026, 3, 25); // Saturday, April 25, 2026
      expect(targetDate.toDateString()).toBe(expected.toDateString());
    });

    it('calculates correctly for larger volunteer count with both days', () => {
      const startDate = new Date(2026, 1, 3); // Tuesday, Feb 3, 2026
      const targetDate = getNextVolunteerMilestoneDate(317, 500, startDate, {
        saturday: true,
        sunday: true,
      });
      expect(targetDate).not.toBeNull();
      // 183 volunteers needed, 2 per week = 91 complete weeks (182 volunteers) + 1 more
      // Next Saturday is Feb 7, 2026
      // 91 weeks later: Saturday, November 6, 2027
      const expected = new Date(2027, 10, 6); // Saturday, Nov 6, 2027
      expect(targetDate.toDateString()).toBe(expected.toDateString());
    });

    it('returns null when current total is already at milestone', () => {
      const startDate = new Date(2026, 1, 3);
      const targetDate = getNextVolunteerMilestoneDate(100, 100, startDate, {
        saturday: true,
        sunday: true,
      });
      expect(targetDate).toBeNull();
    });

    it('returns null when milestone is less than current total', () => {
      const startDate = new Date(2026, 1, 3);
      const targetDate = getNextVolunteerMilestoneDate(150, 100, startDate, {
        saturday: true,
        sunday: true,
      });
      expect(targetDate).toBeNull();
    });

    it('returns null when neither day is selected', () => {
      const startDate = new Date(2026, 1, 3);
      const targetDate = getNextVolunteerMilestoneDate(77, 100, startDate, {
        saturday: false,
        sunday: false,
      });
      expect(targetDate).toBeNull();
    });
  });

  describe('appendVolunteerDaysSummary', () => {
    it('appends volunteer days summary with milestone estimate', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendVolunteerDaysSummary(heading, 317, 500, 'Saturday 2 May 2026');
      const summary = document.querySelector('#volunteer-days-summary');
      expect(summary).not.toBeNull();
      expect(summary.textContent).toBe(
        '317 volunteer days total (expected to reach 500 around Saturday 2 May 2026)'
      );
    });

    it('appends volunteer days summary without milestone estimate', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendVolunteerDaysSummary(heading, 317, null, null);
      const summary = document.querySelector('#volunteer-days-summary');
      expect(summary).not.toBeNull();
      expect(summary.textContent).toBe('317 volunteer days total');
    });

    it('appends preferences toggles', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const heading = document.querySelector('h3');
      appendVolunteerDaysSummary(heading, 317, 500, 'Saturday 2 May 2026');
      const prefsContainer = document.querySelector('#volunteer-days-preferences');
      const saturdayCheckbox = document.querySelector('#volunteer-saturday');
      const sundayCheckbox = document.querySelector('#volunteer-sunday');
      expect(prefsContainer).not.toBeNull();
      expect(saturdayCheckbox).not.toBeNull();
      expect(sundayCheckbox).not.toBeNull();
      expect(saturdayCheckbox.checked).toBe(true);
      expect(sundayCheckbox.checked).toBe(true);
    });

    it('does not append if already applied', () => {
      document.body.innerHTML = '<h3>77 parkruns &amp; 135 junior parkruns total</h3>';
      const heading = document.querySelector('h3');
      heading.dataset.volunteerDaysApplied = 'true';
      appendVolunteerDaysSummary(heading, 317, 500, 'Saturday 2 May 2026');
      const summary = document.querySelector('#volunteer-days-summary');
      expect(summary).toBeNull();
    });
  });

  describe('isDateInNextWeek', () => {
    it('returns true for date today', () => {
      const today = new Date(2026, 1, 3);
      expect(isDateInNextWeek(today, today)).toBe(true);
    });

    it('returns true for date within next 7 days', () => {
      const today = new Date(2026, 1, 3);
      const inFiveDays = new Date(2026, 1, 8);
      expect(isDateInNextWeek(inFiveDays, today)).toBe(true);
    });

    it('returns false for date exactly 7 days away', () => {
      const today = new Date(2026, 1, 3);
      const inSevenDays = new Date(2026, 1, 10);
      expect(isDateInNextWeek(inSevenDays, today)).toBe(false);
    });

    it('returns false for date in the past', () => {
      const today = new Date(2026, 1, 3);
      const yesterday = new Date(2026, 1, 2);
      expect(isDateInNextWeek(yesterday, today)).toBe(false);
    });

    it('returns false for date more than 7 days away', () => {
      const today = new Date(2026, 1, 3);
      const inTenDays = new Date(2026, 1, 13);
      expect(isDateInNextWeek(inTenDays, today)).toBe(false);
    });
  });

  describe('highlightDateIfNeeded', () => {
    it('highlights date within next week', () => {
      const today = new Date(2026, 1, 3); // Tuesday, Feb 3
      const targetDate = new Date(2026, 1, 8); // Sunday, Feb 8 (5 days from today)
      const formattedDate = targetDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      document.body.innerHTML = `<p>expected to reach 500 around ${formattedDate}</p>`;
      const container = document.querySelector('p');
      highlightDateIfNeeded(container, targetDate, today);

      const highlights = container.querySelectorAll('span');
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights[0].style.backgroundColor).toBe('rgb(255, 235, 59)');
    });

    it('does not highlight date outside next week', () => {
      const today = new Date(2026, 1, 3);
      const targetDate = new Date(2026, 1, 17); // More than 7 days away
      const formattedDate = targetDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      document.body.innerHTML = `<p>expected to reach 500 around ${formattedDate}</p>`;
      const container = document.querySelector('p');
      highlightDateIfNeeded(container, targetDate, today);

      const highlights = container.querySelectorAll('span');
      expect(highlights.length).toBe(0);
    });

    it('handles null target date gracefully', () => {
      document.body.innerHTML = '<p>some text</p>';
      const container = document.querySelector('p');
      expect(() => highlightDateIfNeeded(container, null)).not.toThrow();
    });
  });
});
