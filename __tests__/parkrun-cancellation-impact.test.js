const {
  calculateBaseline,
  calculateDistance,
  detectAllEventGaps,
  detectEventGap,
  filterEventsByDateRange,
  getBaselineEventsBefore,
  getCancellationSaturdays,
  isFinishersMaxUpToEvent,
  isInvalidHistoryData,
  parseDateUTC,
} = require('../src/parkrun-cancellation-impact.user.js');

describe('parkrun-cancellation-impact', () => {
  describe('Gap Detection', () => {
    test('detects a single 21-day gap between two events', () => {
      const historyData = {
        rawDates: ['2025-03-08', '2025-03-29'],
        dates: ['8 Mar 2025', '29 Mar 2025'],
        finishers: [966, 943],
        volunteers: [50, 40],
      };

      const gap = detectEventGap(historyData);

      expect(gap).not.toBeNull();
      expect(gap.daysDiff).toBeCloseTo(21, 0);
      expect(gap.gapStartDate.toISOString().split('T')[0]).toBe('2025-03-08');
      expect(gap.gapEndDate.toISOString().split('T')[0]).toBe('2025-03-29');
      expect(gap.eventsBefore).toBe(1);
      expect(gap.eventsAfter).toBe(1);
    });

    test('detects multiple gaps and returns the latest one', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-02-01', '2025-02-08', '2025-03-29'],
        dates: ['4 Jan 2025', '1 Feb 2025', '8 Feb 2025', '29 Mar 2025'],
        finishers: [900, 950, 940, 943],
        volunteers: [45, 50, 48, 40],
      };

      const gap = detectEventGap(historyData);

      expect(gap).not.toBeNull();
      // The latest gap is between 8 Feb and 29 Mar (49 days)
      expect(gap.daysDiff).toBeCloseTo(49, 0);
      expect(gap.gapStartDate.toISOString().split('T')[0]).toBe('2025-02-08');
      expect(gap.gapEndDate.toISOString().split('T')[0]).toBe('2025-03-29');
    });

    test('returns null when no gap exceeds threshold (7 days)', () => {
      const historyData = {
        rawDates: ['2025-03-08', '2025-03-15', '2025-03-22', '2025-03-29'],
        dates: ['8 Mar 2025', '15 Mar 2025', '22 Mar 2025', '29 Mar 2025'],
        finishers: [966, 950, 940, 943],
        volunteers: [50, 48, 46, 40],
      };

      const gap = detectEventGap(historyData);

      expect(gap).toBeNull();
    });

    test('returns null with fewer than 2 events', () => {
      const historyData = {
        rawDates: ['2025-03-08'],
        dates: ['8 Mar 2025'],
        finishers: [966],
        volunteers: [50],
      };

      const gap = detectEventGap(historyData);

      expect(gap).toBeNull();
    });

    test('detects exactly 8-day gap (threshold + 1)', () => {
      const historyData = {
        rawDates: ['2025-03-08', '2025-03-16'],
        dates: ['8 Mar 2025', '16 Mar 2025'],
        finishers: [966, 950],
        volunteers: [50, 48],
      };

      const gap = detectEventGap(historyData);

      expect(gap).not.toBeNull();
      expect(gap.daysDiff).toBeCloseTo(8, 0);
    });
  });

  describe('Ongoing cancellation (gap from last event to reference date)', () => {
    test('detects ongoing cancellation when reference date is more than 7 days after last event', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11', '2025-01-18'],
        dates: ['4 Jan 2025', '11 Jan 2025', '18 Jan 2025'],
        finishers: [900, 950, 940],
        volunteers: [45, 50, 48],
      };
      const referenceDate = parseDateUTC('2025-01-30');

      const gap = detectEventGap(historyData, referenceDate);

      expect(gap).not.toBeNull();
      expect(gap.gapStartDate.toISOString().split('T')[0]).toBe('2025-01-18');
      expect(gap.gapEndDate.toISOString().split('T')[0]).toBe('2025-01-30');
      expect(gap.daysDiff).toBeCloseTo(12, 0);
      expect(gap.eventsBefore).toBe(3);
      expect(gap.eventsAfter).toBe(0);
    });

    test('does not treat as gap when reference is exactly 7 days after last event', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11', '2025-01-18'],
        dates: ['4 Jan 2025', '11 Jan 2025', '18 Jan 2025'],
        finishers: [900, 950, 940],
        volunteers: [45, 50, 48],
      };
      const referenceDate = parseDateUTC('2025-01-25');

      const gap = detectEventGap(historyData, referenceDate);

      expect(gap).toBeNull();
    });

    test('does not treat as gap when reference is ≤7 days after last event', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11', '2025-01-18'],
        dates: ['4 Jan 2025', '11 Jan 2025', '18 Jan 2025'],
        finishers: [900, 950, 940],
        volunteers: [45, 50, 48],
      };
      const referenceDate = parseDateUTC('2025-01-20');

      const gap = detectEventGap(historyData, referenceDate);

      expect(gap).toBeNull();
    });

    test('single event: detects ongoing cancellation when reference > 7 days after', () => {
      const historyData = {
        rawDates: ['2025-01-18'],
        dates: ['18 Jan 2025'],
        finishers: [940],
        volunteers: [48],
      };
      const referenceDate = parseDateUTC('2025-01-30');

      const gap = detectEventGap(historyData, referenceDate);

      expect(gap).not.toBeNull();
      expect(gap.gapStartDate.toISOString().split('T')[0]).toBe('2025-01-18');
      expect(gap.gapEndDate.toISOString().split('T')[0]).toBe('2025-01-30');
      expect(gap.daysDiff).toBeCloseTo(12, 0);
      expect(gap.eventsBefore).toBe(1);
      expect(gap.eventsAfter).toBe(0);
    });

    test('detectAllEventGaps includes ongoing gap when reference > 7 days after last event', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11', '2025-01-18'],
        dates: ['4 Jan 2025', '11 Jan 2025', '18 Jan 2025'],
        finishers: [900, 950, 940],
        volunteers: [45, 50, 48],
      };
      const referenceDate = parseDateUTC('2025-01-30');

      const gaps = detectAllEventGaps(historyData, referenceDate);

      expect(gaps.length).toBe(1);
      expect(gaps[0].gapStartDate.toISOString().split('T')[0]).toBe('2025-01-18');
      expect(gaps[0].gapEndDate.toISOString().split('T')[0]).toBe('2025-01-30');
      expect(gaps[0].eventsAfter).toBe(0);
    });
  });

  describe('12-event baseline (getBaselineEventsBefore)', () => {
    test('uses last 12 events when more than 12 exist before target', () => {
      const rawDates = [];
      const dates = [];
      const finishers = [];
      const volunteers = [];
      for (let w = 0; w < 15; w++) {
        const d = new Date(Date.UTC(2025, 0, 4 + w * 7));
        rawDates.push(d.toISOString().split('T')[0]);
        dates.push(
          d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        );
        finishers.push(200 + w * 10);
        volunteers.push(15 + w);
      }
      const historyData = { rawDates, dates, finishers, volunteers };
      const targetDate = parseDateUTC('2025-04-20'); // after all 15

      const result = getBaselineEventsBefore(historyData, targetDate);

      expect(result.filtered.dates.length).toBe(12);
      expect(result.baseline.totalEvents).toBe(12);
      const startRaw = historyData.rawDates[3];
      const endRaw = historyData.rawDates[14];
      expect(result.window.start.toISOString().split('T')[0]).toBe(startRaw);
      expect(result.window.end.toISOString().split('T')[0]).toBe(endRaw);
    });

    test('uses all available events when fewer than 12 exist before target (cancellation in first 12 weeks)', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11', '2025-01-18', '2025-01-25'],
        dates: ['4 Jan 2025', '11 Jan 2025', '18 Jan 2025', '25 Jan 2025'],
        finishers: [180, 210, 240, 230],
        volunteers: [12, 14, 16, 15],
      };
      const targetDate = parseDateUTC('2025-02-01'); // cancellation on week 5

      const result = getBaselineEventsBefore(historyData, targetDate);

      expect(result.filtered.dates.length).toBe(4);
      expect(result.baseline.totalEvents).toBe(4);
      expect(result.baseline.avgFinishers).toBe(215);
      expect(result.baseline.avgVolunteers).toBe(14);
      expect(result.window.start.toISOString().split('T')[0]).toBe('2025-01-04');
      expect(result.window.end.toISOString().split('T')[0]).toBe('2025-01-25');
    });

    test('uses exactly 12 events when 12 exist before target', () => {
      const rawDates = [];
      const dates = [];
      const finishers = [];
      const volunteers = [];
      for (let w = 0; w < 12; w++) {
        const d = new Date(Date.UTC(2025, 0, 4 + w * 7));
        rawDates.push(d.toISOString().split('T')[0]);
        dates.push(
          d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        );
        finishers.push(100);
        volunteers.push(10);
      }
      const historyData = { rawDates, dates, finishers, volunteers };
      const targetDate = parseDateUTC('2025-03-29'); // after 12th event

      const result = getBaselineEventsBefore(historyData, targetDate);

      expect(result.filtered.dates.length).toBe(12);
      expect(result.baseline.totalEvents).toBe(12);
      expect(result.window.start.toISOString().split('T')[0]).toBe('2025-01-04');
      expect(result.window.end.toISOString().split('T')[0]).toBe('2025-03-22');
    });

    test('returns empty baseline when no events before target', () => {
      const historyData = {
        rawDates: ['2025-02-01', '2025-02-08'],
        dates: ['1 Feb 2025', '8 Feb 2025'],
        finishers: [100, 110],
        volunteers: [10, 12],
      };
      const targetDate = parseDateUTC('2025-01-15');

      const result = getBaselineEventsBefore(historyData, targetDate);

      expect(result.filtered.dates.length).toBe(0);
      expect(result.baseline.totalEvents).toBe(0);
      expect(result.baseline.avgFinishers).toBe(0);
      expect(result.baseline.avgVolunteers).toBe(0);
      expect(result.window.start.toISOString().split('T')[0]).toBe('2025-01-15');
      expect(result.window.end.toISOString().split('T')[0]).toBe('2025-01-15');
    });

    test('uses one event when only one exists before target (cancel on second weekend)', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11'],
        dates: ['4 Jan 2025', '11 Jan 2025'],
        finishers: [150, 180],
        volunteers: [12, 14],
      };
      const targetDate = parseDateUTC('2025-01-11'); // cancel on week 2, only 4 Jan is before

      const result = getBaselineEventsBefore(historyData, targetDate);

      expect(result.filtered.dates.length).toBe(1);
      expect(result.baseline.totalEvents).toBe(1);
      expect(result.baseline.avgFinishers).toBe(150);
      expect(result.window.start.toISOString().split('T')[0]).toBe('2025-01-04');
      expect(result.window.end.toISOString().split('T')[0]).toBe('2025-01-04');
    });

    test('uses both events when only two exist before target (cancel on third weekend)', () => {
      const historyData = {
        rawDates: ['2025-01-04', '2025-01-11'],
        dates: ['4 Jan 2025', '11 Jan 2025'],
        finishers: [150, 180],
        volunteers: [12, 14],
      };
      const targetDate = parseDateUTC('2025-01-18'); // cancel on week 3

      const result = getBaselineEventsBefore(historyData, targetDate);

      expect(result.filtered.dates.length).toBe(2);
      expect(result.baseline.totalEvents).toBe(2);
      expect(result.baseline.avgFinishers).toBe(165);
      expect(result.window.start.toISOString().split('T')[0]).toBe('2025-01-04');
      expect(result.window.end.toISOString().split('T')[0]).toBe('2025-01-11');
    });

    test('respects custom n when provided', () => {
      const rawDates = [];
      const dates = [];
      const finishers = [];
      const volunteers = [];
      for (let w = 0; w < 20; w++) {
        const d = new Date(Date.UTC(2025, 0, 4 + w * 7));
        rawDates.push(d.toISOString().split('T')[0]);
        dates.push(
          d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        );
        finishers.push(100);
        volunteers.push(10);
      }
      const historyData = { rawDates, dates, finishers, volunteers };
      const targetDate = parseDateUTC('2025-06-01');

      const result = getBaselineEventsBefore(historyData, targetDate, 5);

      expect(result.filtered.dates.length).toBe(5);
      expect(result.baseline.totalEvents).toBe(5);
    });
  });

  describe('Date Filtering', () => {
    test('filters events within date range', () => {
      const historyData = {
        rawDates: ['2025-02-01', '2025-02-15', '2025-03-01', '2025-03-15'],
        dates: ['1 Feb 2025', '15 Feb 2025', '1 Mar 2025', '15 Mar 2025'],
        finishers: [100, 110, 120, 130],
        volunteers: [10, 12, 14, 16],
      };

      const startDate = new Date('2025-02-10');
      const endDate = new Date('2025-03-10');

      const filtered = filterEventsByDateRange(historyData, startDate, endDate);

      expect(filtered.dates).toEqual(['15 Feb 2025', '1 Mar 2025']);
      expect(filtered.finishers).toEqual([110, 120]);
      expect(filtered.volunteers).toEqual([12, 14]);
    });

    test('returns empty arrays when no events in range', () => {
      const historyData = {
        rawDates: ['2025-01-01', '2025-01-08'],
        dates: ['1 Jan 2025', '8 Jan 2025'],
        finishers: [100, 110],
        volunteers: [10, 12],
      };

      const startDate = new Date('2025-03-01');
      const endDate = new Date('2025-03-31');

      const filtered = filterEventsByDateRange(historyData, startDate, endDate);

      expect(filtered.dates).toEqual([]);
      expect(filtered.finishers).toEqual([]);
      expect(filtered.volunteers).toEqual([]);
    });

    test('filters events at boundary dates (inclusive)', () => {
      const historyData = {
        rawDates: ['2025-02-15', '2025-03-15'],
        dates: ['15 Feb 2025', '15 Mar 2025'],
        finishers: [100, 120],
        volunteers: [10, 14],
      };

      const startDate = new Date('2025-02-15');
      const endDate = new Date('2025-03-15');

      const filtered = filterEventsByDateRange(historyData, startDate, endDate);

      expect(filtered.dates).toEqual(['15 Feb 2025', '15 Mar 2025']);
      expect(filtered.finishers).toEqual([100, 120]);
    });
  });

  describe('Baseline Calculation', () => {
    test('calculates average finishers and volunteers', () => {
      const data = {
        dates: ['1 Feb 2025', '8 Feb 2025', '15 Feb 2025'],
        finishers: [100, 110, 120],
        volunteers: [10, 12, 14],
      };

      const baseline = calculateBaseline(data);

      expect(baseline.avgFinishers).toBe(110);
      expect(baseline.avgVolunteers).toBe(12);
      expect(baseline.totalEvents).toBe(3);
    });

    test('calculates min and max values', () => {
      const data = {
        dates: ['1 Feb 2025', '8 Feb 2025', '15 Feb 2025'],
        finishers: [100, 110, 120],
        volunteers: [10, 15, 12],
      };

      const baseline = calculateBaseline(data);

      expect(baseline.minFinishers).toBe(100);
      expect(baseline.maxFinishers).toBe(120);
      expect(baseline.minVolunteers).toBe(10);
      expect(baseline.maxVolunteers).toBe(15);
    });

    test('returns zeros for empty data', () => {
      const data = {
        dates: [],
        finishers: [],
        volunteers: [],
      };

      const baseline = calculateBaseline(data);

      expect(baseline.avgFinishers).toBe(0);
      expect(baseline.avgVolunteers).toBe(0);
      expect(baseline.totalEvents).toBe(0);
    });

    test('rounds averages correctly', () => {
      const data = {
        dates: ['1 Feb 2025', '8 Feb 2025', '15 Feb 2025'],
        finishers: [100, 101, 102],
        volunteers: [10, 11, 12],
      };

      const baseline = calculateBaseline(data);

      expect(baseline.avgFinishers).toBe(101);
      expect(baseline.avgVolunteers).toBe(11);
    });
  });

  describe('Distance Calculation', () => {
    test('calculates distance between two coordinates', () => {
      // Sydney Opera House vs Bondi Beach (roughly 7-8 km)
      const lat1 = -33.857;
      const lon1 = 151.215;
      const lat2 = -33.8808;
      const lon2 = 151.2757;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      expect(distance).toBeGreaterThan(6);
      expect(distance).toBeLessThan(10);
    });

    test('calculates zero distance for same coordinates', () => {
      const distance = calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);

      expect(distance).toBeCloseTo(0, 1);
    });

    test('calculates approximate distance to known locations', () => {
      // London to Paris is roughly 343 km
      const londonLat = 51.5074;
      const londonLon = -0.1278;
      const parisLat = 48.8566;
      const parisLon = 2.3522;

      const distance = calculateDistance(londonLat, londonLon, parisLat, parisLon);

      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });
  });

  describe('Real-world scenario: Maribyrnong gap', () => {
    test('correctly detects consecutive weekly events without gaps', () => {
      // Events in chronological order with 7-day gaps (threshold)
      const maribyrnongHistory = {
        rawDates: ['2025-04-05', '2025-04-12', '2025-04-19', '2025-04-26'],
        dates: ['5 Apr 2025', '12 Apr 2025', '19 Apr 2025', '26 Apr 2025'],
        finishers: [920, 880, 900, 950],
        volunteers: [45, 42, 44, 46],
      };

      const gap = detectEventGap(maribyrnongHistory);

      // 7-day gaps should NOT trigger (threshold is > 7 days)
      expect(gap).toBeNull();
    });

    test('correctly detects gap with proper chronological ordering', () => {
      // Events in chronological order (oldest to newest)
      const maribyrnongHistory = {
        rawDates: ['2025-03-08', '2025-03-29', '2025-04-05', '2025-04-12'],
        dates: ['8 Mar 2025', '29 Mar 2025', '5 Apr 2025', '12 Apr 2025'],
        eventNumbers: [629, 630, 631, 632],
        finishers: [966, 943, 920, 880],
        volunteers: [50, 40, 42, 45],
      };

      const gap = detectEventGap(maribyrnongHistory);

      expect(gap).not.toBeNull();
      // The 21-day gap is between 8 Mar and 29 Mar
      expect(gap.daysDiff).toBeCloseTo(21, 0);
      expect(gap.gapStartDate.toISOString().split('T')[0]).toBe('2025-03-08');
      expect(gap.gapEndDate.toISOString().split('T')[0]).toBe('2025-03-29');
    });
  });

  describe('UTC Date Handling & Saturday Calculations', () => {
    test('correctly identifies all gaps in Coburg October 2022 history', () => {
      const coburgHistory = {
        rawDates: ['2022-10-01', '2022-10-22', '2022-11-05'],
        dates: ['1 Oct 2022', '22 Oct 2022', '5 Nov 2022'],
        eventNumbers: [325, 326, 327],
        finishers: [142, 114, 162],
        volunteers: [12, 18, 16],
      };

      const gaps = detectAllEventGaps(coburgHistory);

      expect(gaps.length).toBe(2);
      expect(gaps[0].gapStartDate.toISOString().split('T')[0]).toBe('2022-10-01');
      expect(gaps[0].gapEndDate.toISOString().split('T')[0]).toBe('2022-10-22');
      expect(gaps[0].daysDiff).toBeCloseTo(21, 0);

      expect(gaps[1].gapStartDate.toISOString().split('T')[0]).toBe('2022-10-22');
      expect(gaps[1].gapEndDate.toISOString().split('T')[0]).toBe('2022-11-05');
      expect(gaps[1].daysDiff).toBeCloseTo(14, 0);
    });

    test('correctly calculates Saturdays for 1 Oct to 22 Oct gap (should be 8 Oct and 15 Oct)', () => {
      const gapStart = parseDateUTC('2022-10-01');
      const gapEnd = parseDateUTC('2022-10-22');

      const saturdays = getCancellationSaturdays(gapStart, gapEnd);

      expect(saturdays.length).toBe(2);
      expect(saturdays[0].toISOString().split('T')[0]).toBe('2022-10-08');
      expect(saturdays[1].toISOString().split('T')[0]).toBe('2022-10-15');
    });

    test('correctly calculates Saturdays for 22 Oct to 5 Nov gap (should be 29 Oct)', () => {
      const gapStart = parseDateUTC('2022-10-22');
      const gapEnd = parseDateUTC('2022-11-05');

      const saturdays = getCancellationSaturdays(gapStart, gapEnd);

      expect(saturdays.length).toBe(1);
      expect(saturdays[0].toISOString().split('T')[0]).toBe('2022-10-29');
    });

    test('verifies all calculated Saturdays are actually Saturdays', () => {
      const gapStart = parseDateUTC('2022-10-01');
      const gapEnd = parseDateUTC('2022-11-05');

      const saturdays = getCancellationSaturdays(gapStart, gapEnd);

      expect(saturdays.length).toBe(4);
      saturdays.forEach((date) => {
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek).toBe(6);
      });
    });

    test('gap with no Saturdays (end date same week)', () => {
      const saturdays = getCancellationSaturdays(
        parseDateUTC('2025-01-08'),
        parseDateUTC('2025-01-15')
      );
      expect(saturdays.length).toBe(1);
      expect(saturdays[0].toISOString().split('T')[0]).toBe('2025-01-11');
    });

    test('gap with exactly 15 days', () => {
      const saturdays = getCancellationSaturdays(
        parseDateUTC('2025-01-08'),
        parseDateUTC('2025-01-23')
      );
      expect(saturdays.length).toBe(2);
      expect(saturdays[0].toISOString().split('T')[0]).toBe('2025-01-11');
      expect(saturdays[1].toISOString().split('T')[0]).toBe('2025-01-18');
    });

    test('gap spanning multiple weeks', () => {
      const saturdays = getCancellationSaturdays(
        parseDateUTC('2025-01-01'),
        parseDateUTC('2025-02-01')
      );
      expect(saturdays.length).toBe(4);
      expect(saturdays[0].toISOString().split('T')[0]).toBe('2025-01-04');
      expect(saturdays[1].toISOString().split('T')[0]).toBe('2025-01-11');
      expect(saturdays[2].toISOString().split('T')[0]).toBe('2025-01-18');
      expect(saturdays[3].toISOString().split('T')[0]).toBe('2025-01-25');
    });

    test('gap starting on Saturday (normal case)', () => {
      const saturdays = getCancellationSaturdays(
        parseDateUTC('2025-01-04'),
        parseDateUTC('2025-01-25')
      );
      expect(saturdays.length).toBe(2);
      expect(saturdays[0].toISOString().split('T')[0]).toBe('2025-01-11');
      expect(saturdays[1].toISOString().split('T')[0]).toBe('2025-01-18');
    });
  });

  test('should detect cancellation for Warringal Parklands on 2026-01-31', () => {
    // Last event was 2026-01-24 (Saturday)
    const historyData = {
      rawDates: ['2026-01-03', '2026-01-10', '2026-01-17', '2026-01-24'],
      dates: ['3 Jan 2026', '10 Jan 2026', '17 Jan 2026', '24 Jan 2026'],
      finishers: [200, 210, 220, 230],
      volunteers: [15, 16, 17, 18],
    };
    const referenceDate = parseDateUTC('2026-01-31');
    const gap = detectEventGap(historyData, referenceDate);
    expect(gap).toBeNull();
  });

  test('should NOT detect a gap if only 6 days since last event', () => {
    const historyData = {
      rawDates: ['2026-01-03', '2026-01-10', '2026-01-17', '2026-01-24'],
      dates: ['3 Jan 2026', '10 Jan 2026', '17 Jan 2026', '24 Jan 2026'],
      finishers: [200, 210, 220, 230],
      volunteers: [15, 16, 17, 18],
    };
    const referenceDate = parseDateUTC('2026-01-30');
    const gap = detectEventGap(historyData, referenceDate);
    expect(gap).toBeNull();
  });
});

describe('isFinishersMaxUpToEvent', () => {
  test('returns true when finishers is the max up to the given event number', () => {
    const historyData = {
      eventNumbers: ['1', '2', '3', '4', '5'],
      finishers: [100, 150, 120, 110, 200],
    };

    // Event 5 with 200 finishers is the max up to event 5
    expect(isFinishersMaxUpToEvent(historyData, '5', 200)).toBe(true);
  });

  test('returns false when finishers is not the max up to the given event number', () => {
    const historyData = {
      eventNumbers: ['1', '2', '3', '4', '5'],
      finishers: [100, 150, 120, 110, 200],
    };

    // Event 5 with 150 finishers is not the max up to event 5 (max is 200)
    expect(isFinishersMaxUpToEvent(historyData, '5', 150)).toBe(false);
  });

  test('returns true when finishers matches the max in the middle of history', () => {
    const historyData = {
      eventNumbers: ['1', '2', '3', '4', '5'],
      finishers: [100, 200, 120, 110, 150],
    };

    // Event 3 with 120 finishers: max up to event 3 is 200 (event 2), so false
    expect(isFinishersMaxUpToEvent(historyData, '3', 120)).toBe(false);

    // Event 2 with 200 finishers is the max up to event 2
    expect(isFinishersMaxUpToEvent(historyData, '2', 200)).toBe(true);
  });

  test('returns true when finishers is max from event 1 only', () => {
    const historyData = {
      eventNumbers: ['1', '2', '3', '4', '5'],
      finishers: [250, 200, 150, 100, 50],
    };

    // Event 1 with 250 is the max
    expect(isFinishersMaxUpToEvent(historyData, '1', 250)).toBe(true);
  });

  test('returns false when event number not found in history', () => {
    const historyData = {
      eventNumbers: ['1', '2', '3', '4', '5'],
      finishers: [100, 150, 120, 110, 200],
    };

    // Event 999 doesn't exist
    expect(isFinishersMaxUpToEvent(historyData, '999', 200)).toBe(false);
  });

  test('returns false when historyData is empty', () => {
    const historyData = {
      eventNumbers: [],
      finishers: [],
    };

    expect(isFinishersMaxUpToEvent(historyData, '1', 100)).toBe(false);
  });

  test('returns false when historyData is null', () => {
    expect(isFinishersMaxUpToEvent(null, '1', 100)).toBe(false);
  });

  test('handles real-world example: Diamond Creek event 567', () => {
    // Simulating Diamond Creek history where event 567 had 451 finishers
    // and this was their maximum
    const historyData = {
      eventNumbers: Array.from({ length: 567 }, (_, i) => String(i + 1)),
      finishers: Array.from({ length: 566 }, (_, i) => {
        // Create a trend where most events have fewer finishers
        if (i < 200) return 300 + Math.random() * 50;
        if (i < 400) return 350 + Math.random() * 50;
        return 400 + Math.random() * 40; // gradually approaching 451
      }).concat([451]), // Event 567 has 451 finishers (the max)
    };

    expect(isFinishersMaxUpToEvent(historyData, '567', 451)).toBe(true);

    // If a previous event had 451, it would still be true (tied for max)
    historyData.finishers[400] = 451; // Event 401 also had 451
    expect(isFinishersMaxUpToEvent(historyData, '567', 451)).toBe(true);

    // But if a later event had MORE, then event 567 would not be max
    historyData.finishers[500] = 500; // Event 501 had 500 finishers (higher than 451)
    expect(isFinishersMaxUpToEvent(historyData, '567', 451)).toBe(false);
  });

  test('returns true when finishers equals a previous max (tied for max)', () => {
    const historyData = {
      eventNumbers: ['1', '2', '3', '4', '5'],
      finishers: [100, 200, 150, 200, 180],
    };

    // Event 4 with 200 finishers equals the max from event 2, so it's a max
    expect(isFinishersMaxUpToEvent(historyData, '4', 200)).toBe(true);
  });
});

describe('isInvalidHistoryData', () => {
  test('returns true for null', () => {
    expect(isInvalidHistoryData(null)).toBe(true);
  });

  test('returns true for undefined', () => {
    expect(isInvalidHistoryData(undefined)).toBe(true);
  });

  test('returns true for WAF response (JavaScript is disabled)', () => {
    expect(
      isInvalidHistoryData({
        eventName: 'berwicksprings',
        title: 'JavaScript is disabled',
        eventNumbers: [],
        dates: [],
        rawDates: [],
        finishers: [],
        volunteers: [],
      })
    ).toBe(true);
  });

  test('returns false for valid history data with events', () => {
    expect(
      isInvalidHistoryData({
        eventName: 'albertmelbourne',
        title: 'Albert Melbourne parkrun',
        eventNumbers: ['1', '2', '3'],
        dates: ['1 Jan 2025', '8 Jan 2025', '15 Jan 2025'],
        rawDates: ['2025-01-01', '2025-01-08', '2025-01-15'],
        finishers: [100, 120, 110],
        volunteers: [20, 22, 21],
      })
    ).toBe(false);
  });

  test('returns false for valid history data with no events (new event)', () => {
    expect(
      isInvalidHistoryData({
        eventName: 'newevent',
        title: 'New Event parkrun',
        eventNumbers: [],
        dates: [],
        rawDates: [],
        finishers: [],
        volunteers: [],
      })
    ).toBe(false);
  });
});
