const {
  eventHistoryHasEnoughEventsForRollingAverage,
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
});
