describe('parkrun-cancellation-impact', () => {
  // Constants from the script
  const GAP_THRESHOLD_DAYS = 7;

  // Pure functions extracted for testing
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function detectEventGap(historyData) {
    const dates = historyData.rawDates.map((d) => new Date(d));

    if (dates.length < 2) {
      return null;
    }

    const gaps = [];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
      const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > GAP_THRESHOLD_DAYS) {
        gaps.push({
          gapStartDate: prevDate,
          gapEndDate: currDate,
          daysDiff,
          eventsBefore: i,
          eventsAfter: dates.length - i,
        });
      }
    }

    if (gaps.length === 0) {
      return null;
    }

    return gaps[gaps.length - 1];
  }

  // Intentionally unused for this test file - defined to mirror script structure
  // eslint-disable-next-line no-unused-vars
  function detectAllEventGaps(historyData) {
    const dates = historyData.rawDates.map((d) => new Date(d));

    if (dates.length < 2) {
      return [];
    }

    const gaps = [];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
      const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > GAP_THRESHOLD_DAYS) {
        gaps.push({
          gapStartDate: prevDate,
          gapEndDate: currDate,
          daysDiff,
          eventsBefore: i,
          eventsAfter: dates.length - i,
        });
      }
    }

    return gaps;
  }

  // Intentionally unused for this test file - defined to mirror script structure
  // eslint-disable-next-line no-unused-vars
  function getCancellationSaturdays(gapStartDate, gapEndDate) {
    const saturdays = [];
    let current = new Date(gapStartDate);
    current.setDate(current.getDate() + 7); // Start from first Saturday after gap start

    while (current < gapEndDate) {
      saturdays.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }

    return saturdays;
  }

  function filterEventsByDateRange(historyData, startDate, endDate) {
    const filtered = {
      dates: [],
      finishers: [],
      volunteers: [],
    };

    historyData.rawDates.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      if (date >= startDate && date <= endDate) {
        filtered.dates.push(historyData.dates[index]);
        filtered.finishers.push(historyData.finishers[index]);
        filtered.volunteers.push(historyData.volunteers[index]);
      }
    });

    return filtered;
  }

  function calculateBaseline(data) {
    if (data.dates.length === 0) {
      return {
        avgFinishers: 0,
        avgVolunteers: 0,
        totalEvents: 0,
        minFinishers: 0,
        maxFinishers: 0,
        minVolunteers: 0,
        maxVolunteers: 0,
      };
    }

    const avgFinishers = Math.round(data.finishers.reduce((a, b) => a + b, 0) / data.dates.length);
    const avgVolunteers = Math.round(
      data.volunteers.reduce((a, b) => a + b, 0) / data.dates.length
    );

    return {
      avgFinishers,
      avgVolunteers,
      totalEvents: data.dates.length,
      minFinishers: Math.min(...data.finishers),
      maxFinishers: Math.max(...data.finishers),
      minVolunteers: Math.min(...data.volunteers),
      maxVolunteers: Math.max(...data.volunteers),
    };
  }

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
});
