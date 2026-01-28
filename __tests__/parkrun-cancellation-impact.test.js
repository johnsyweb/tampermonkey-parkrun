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

  function parseDateUTC(dateStr) {
    return new Date(`${dateStr}T00:00:00Z`);
  }

  function detectEventGap(historyData, referenceDate) {
    const dates = historyData.rawDates.map((d) => parseDateUTC(d));

    if (dates.length < 1) {
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

    if (gaps.length > 0) {
      return gaps[gaps.length - 1];
    }

    // No inter-event gap > 7 days: check ongoing cancellation (last event to reference/today)
    if (referenceDate && dates.length >= 1) {
      const lastUTC = dates[dates.length - 1];
      const refStr = referenceDate.toISOString().split('T')[0];
      const refUTC = parseDateUTC(refStr);
      const daysDiff = (refUTC - lastUTC) / (1000 * 60 * 60 * 24);
      if (daysDiff > GAP_THRESHOLD_DAYS) {
        return {
          gapStartDate: lastUTC,
          gapEndDate: refUTC,
          daysDiff,
          eventsBefore: dates.length,
          eventsAfter: 0,
        };
      }
    }

    return null;
  }

  function detectAllEventGaps(historyData, referenceDate) {
    const dates = historyData.rawDates.map((d) => parseDateUTC(d));

    if (dates.length < 1) {
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

    if (referenceDate && dates.length >= 1) {
      const lastUTC = dates[dates.length - 1];
      const refStr = referenceDate.toISOString().split('T')[0];
      const refUTC = parseDateUTC(refStr);
      const daysDiff = (refUTC - lastUTC) / (1000 * 60 * 60 * 24);
      if (daysDiff > GAP_THRESHOLD_DAYS) {
        gaps.push({
          gapStartDate: lastUTC,
          gapEndDate: refUTC,
          daysDiff,
          eventsBefore: dates.length,
          eventsAfter: 0,
        });
      }
    }

    return gaps;
  }

  function getCancellationSaturdays(gapStartDate, gapEndDate) {
    const saturdays = [];

    const startStr = gapStartDate.toISOString().split('T')[0];
    const startDate = parseDateUTC(startStr);
    const startDayOfWeek = startDate.getUTCDay();

    let daysUntilSaturday = (6 - startDayOfWeek) % 7;
    if (daysUntilSaturday === 0) {
      daysUntilSaturday = 7;
    }

    const current = new Date(startDate);
    current.setUTCDate(current.getUTCDate() + daysUntilSaturday);

    while (current < gapEndDate) {
      saturdays.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 7);
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
});
