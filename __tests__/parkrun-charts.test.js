const { eventHistoryHasEnoughEventsForRollingAverage } = require('../src/parkrun-charts.user.js');

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
});
