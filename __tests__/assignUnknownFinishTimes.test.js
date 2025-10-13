const { assignUnknownFinishTimes } = require('../lib/assignUnknownFinishTimes.js');

describe('assignUnknownFinishTimes', () => {
  describe('edge cases', () => {
    it('should handle empty array', () => {
      const finishers = [];
      const result = assignUnknownFinishTimes(finishers);
      expect(result).toEqual([]);
    });

    it('should handle single finisher with time', () => {
      const finishers = [{ timeSec: 1500, timeStr: '25:00' }];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[0].timeSec).toBe(1500);
    });

    it('should handle single finisher without time', () => {
      const finishers = [{ timeSec: 0, timeStr: '' }];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[0].timeSec).toBe(0);
      expect(result[0].estimatedTime).toBe(false);
    });

    it('should assign time to unknown first finisher based on next finisher', () => {
      const finishers = [
        { timeSec: 0, timeStr: '' },
        { timeSec: 1500, timeStr: '25:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[0].timeSec).toBe(1500);
      expect(result[0].estimatedTime).toBe(true);
    });

    it('should assign time to unknown last finisher based on previous finisher', () => {
      const finishers = [
        { timeSec: 1500, timeStr: '25:00' },
        { timeSec: 0, timeStr: '' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[1].timeSec).toBe(1500);
      expect(result[1].estimatedTime).toBe(true);
    });

    it('should handle all finishers without times', () => {
      const finishers = [
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[0].timeSec).toBe(0);
      expect(result[1].timeSec).toBe(0);
      expect(result[2].timeSec).toBe(0);
    });
  });

  describe('consecutive unknown finishers', () => {
    it('should assign time to two consecutive unknown finishers in the middle', () => {
      const finishers = [
        { timeSec: 1200, timeStr: '20:00' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 1500, timeStr: '25:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[1].timeSec).toBe(1200);
      expect(result[1].estimatedTime).toBe(true);
      expect(result[2].timeSec).toBe(1200);
      expect(result[2].estimatedTime).toBe(true);
    });

    it('should assign time to three consecutive unknown finishers', () => {
      const finishers = [
        { timeSec: 1800, timeStr: '30:00' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 2100, timeStr: '35:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[1].timeSec).toBe(1800);
      expect(result[1].estimatedTime).toBe(true);
      expect(result[2].timeSec).toBe(1800);
      expect(result[2].estimatedTime).toBe(true);
      expect(result[3].timeSec).toBe(1800);
      expect(result[3].estimatedTime).toBe(true);
    });

    it('should assign time to unknown finishers at start of list', () => {
      const finishers = [
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 1500, timeStr: '25:00' },
        { timeSec: 1800, timeStr: '30:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[0].timeSec).toBe(1500);
      expect(result[0].estimatedTime).toBe(true);
      expect(result[1].timeSec).toBe(1500);
      expect(result[1].estimatedTime).toBe(true);
    });

    it('should assign time to unknown finishers at end of list', () => {
      const finishers = [
        { timeSec: 1500, timeStr: '25:00' },
        { timeSec: 1800, timeStr: '30:00' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[2].timeSec).toBe(1800);
      expect(result[2].estimatedTime).toBe(true);
      expect(result[3].timeSec).toBe(1800);
      expect(result[3].estimatedTime).toBe(true);
    });
  });

  describe('single unknown finishers', () => {
    it('should assign time to single unknown finisher between two known times', () => {
      const finishers = [
        { timeSec: 1200, timeStr: '20:00' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 1500, timeStr: '25:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[1].timeSec).toBe(1200);
      expect(result[1].estimatedTime).toBe(true);
    });

    it('should not modify finishers with existing times', () => {
      const finishers = [
        { timeSec: 1200, timeStr: '20:00' },
        { timeSec: 1500, timeStr: '25:00' },
        { timeSec: 1800, timeStr: '30:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[0].timeSec).toBe(1200);
      expect(result[0].estimatedTime).toBeUndefined();
      expect(result[1].timeSec).toBe(1500);
      expect(result[1].estimatedTime).toBeUndefined();
      expect(result[2].timeSec).toBe(1800);
      expect(result[2].estimatedTime).toBeUndefined();
    });
  });

  describe('mixed scenarios', () => {
    it('should handle multiple groups of unknown finishers', () => {
      const finishers = [
        { timeSec: 1200, timeStr: '20:00' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 1500, timeStr: '25:00' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 0, timeStr: '' },
        { timeSec: 1800, timeStr: '30:00' },
      ];
      const result = assignUnknownFinishTimes(finishers);
      expect(result[1].timeSec).toBe(1200);
      expect(result[1].estimatedTime).toBe(true);
      expect(result[3].timeSec).toBe(1500);
      expect(result[3].estimatedTime).toBe(true);
      expect(result[4].timeSec).toBe(1500);
      expect(result[4].estimatedTime).toBe(true);
    });
  });
});
