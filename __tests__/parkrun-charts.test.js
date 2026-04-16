const {
  buildEventHistoryDatasets,
  eventHistoryHasEnoughEventsForRollingAverage,
  formatLatestEventSummaryHtml,
  isRecordFinisherOrVolunteerCount,
} = require('../src/parkrun-charts.user.js');

describe('parkrun-charts', () => {
  describe('eventHistoryHasEnoughEventsForRollingAverage', () => {
    const windowSize = 12;

    it('returns false when event count is below the rolling window', () => {
      expect(eventHistoryHasEnoughEventsForRollingAverage(0, windowSize)).toBe(false);
      expect(eventHistoryHasEnoughEventsForRollingAverage(1, windowSize)).toBe(false);
      expect(eventHistoryHasEnoughEventsForRollingAverage(11, windowSize)).toBe(false);
    });

    it('returns true when event count is at least the rolling window', () => {
      expect(eventHistoryHasEnoughEventsForRollingAverage(12, windowSize)).toBe(true);
      expect(eventHistoryHasEnoughEventsForRollingAverage(100, windowSize)).toBe(true);
    });
  });

  describe('isRecordFinisherOrVolunteerCount', () => {
    const minMax = {
      min: { value: 5, date: '1 Jan 2020', eventNumber: '1' },
      max: { value: 20, date: '1 Jan 2025', eventNumber: '10' },
    };

    it('returns true when count equals overall min or max', () => {
      expect(isRecordFinisherOrVolunteerCount(5, minMax)).toBe(true);
      expect(isRecordFinisherOrVolunteerCount(20, minMax)).toBe(true);
    });

    it('returns false when count is strictly between min and max', () => {
      expect(isRecordFinisherOrVolunteerCount(12, minMax)).toBe(false);
    });

    it('returns true when min equals max and count matches', () => {
      const single = {
        min: { value: 100, date: '1 Jan 2020', eventNumber: '1' },
        max: { value: 100, date: '1 Jan 2020', eventNumber: '1' },
      };
      expect(isRecordFinisherOrVolunteerCount(100, single)).toBe(true);
    });
  });

  describe('formatLatestEventSummaryHtml', () => {
    it('omits average text when there are fewer than 12 events', () => {
      const summary = formatLatestEventSummaryHtml({
        latestDate: '13 Apr 2026',
        latestEventNumber: '11',
        latestFinishers: 245,
        latestVolunteers: 31,
        latestFinishersAvg: null,
        latestVolunteersAvg: null,
        rollingAvgWindowSize: 12,
      });

      expect(summary).toContain('<strong>Latest event:</strong> 13 Apr 2026 (Event #11)');
      expect(summary).toContain('Finishers: 245');
      expect(summary).toContain('Volunteers: 31');
      expect(summary).not.toContain('12-Event avg');
    });

    it('includes 12-event average text at one decimal place once available', () => {
      const summary = formatLatestEventSummaryHtml({
        latestDate: '20 Apr 2026',
        latestEventNumber: '12',
        latestFinishers: 260,
        latestVolunteers: 35,
        latestFinishersAvg: 243.666,
        latestVolunteersAvg: 31.222,
        rollingAvgWindowSize: 12,
      });

      expect(summary).toContain('Finishers: 260 (12-Event avg: 243.7)');
      expect(summary).toContain('Volunteers: 35 (12-Event avg: 31.2)');
    });
  });

  describe('buildEventHistoryDatasets', () => {
    const baseArgs = {
      historyData: {
        eventNumbers: [],
        finishers: [],
        volunteers: [],
      },
      finishersAxisId: 'y-finishers',
      volunteersAxisId: 'y-volunteers',
      finishersRollingAvg: [],
      volunteersRollingAvg: [],
      rollingAvgWindowSize: 12,
    };

    it('includes only finishers and volunteers datasets before rolling averages are available', () => {
      const datasets = buildEventHistoryDatasets({
        ...baseArgs,
        historyData: {
          eventNumbers: Array.from({ length: 11 }, (_, i) => `${i + 1}`),
          finishers: Array.from({ length: 11 }, (_, i) => 100 + i),
          volunteers: Array.from({ length: 11 }, (_, i) => 20 + i),
        },
        finishersRollingAvg: Array.from({ length: 11 }, () => null),
        volunteersRollingAvg: Array.from({ length: 11 }, () => null),
      });

      expect(datasets).toHaveLength(2);
      expect(datasets.map((d) => d.label)).toEqual(['Finishers', 'Volunteers']);
    });

    it('includes rolling-average datasets once enough events exist', () => {
      const datasets = buildEventHistoryDatasets({
        ...baseArgs,
        historyData: {
          eventNumbers: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
          finishers: Array.from({ length: 12 }, (_, i) => 100 + i),
          volunteers: Array.from({ length: 12 }, (_, i) => 20 + i),
        },
        finishersRollingAvg: Array.from({ length: 12 }, (_, i) => (i < 11 ? null : 105.5)),
        volunteersRollingAvg: Array.from({ length: 12 }, (_, i) => (i < 11 ? null : 25.2)),
      });

      expect(datasets).toHaveLength(4);
      expect(datasets.map((d) => d.label)).toEqual([
        'Finishers',
        'Volunteers',
        '12-Event Avg (Finishers)',
        '12-Event Avg (Volunteers)',
      ]);
    });
  });
});
