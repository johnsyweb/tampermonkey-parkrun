describe('Coburg cancellation dates (October 2022)', () => {
  const GAP_THRESHOLD_DAYS = 7;

  function parseDateUTC(dateStr) {
    return new Date(`${dateStr}T00:00:00Z`);
  }

  function detectAllEventGaps(historyData) {
    const dates = historyData.rawDates.map((d) => parseDateUTC(d));

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

  describe('Edge cases - date calculations', () => {
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
