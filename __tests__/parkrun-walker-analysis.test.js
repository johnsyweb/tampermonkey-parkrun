// __tests__/parkrun-walker-analysis.test.js

const { assignUnknownFinishTimes } = require('../parkrun-walker-analysis.user');

describe('assignUnknownFinishTimes', () => {
  it('should assign estimated times to finishers with missing time', () => {
    const finishers = [
      { timeStr: '25:00', timeSec: 1500 },
      { timeStr: '', timeSec: 0 },
      { timeStr: '27:00', timeSec: 1620 },
    ];
    const result = assignUnknownFinishTimes(finishers);
    expect(result[1].timeSec).toBe(1500); // Should use previous known time
    expect(result[1].estimatedTime).toBe(true);
  });

  it('should use next known time if no previous', () => {
    const finishers = [
      { timeStr: '', timeSec: 0 },
      { timeStr: '30:00', timeSec: 1800 },
    ];
    const result = assignUnknownFinishTimes(finishers);
    expect(result[0].timeSec).toBe(1800);
    expect(result[0].estimatedTime).toBe(true);
  });

  it('should leave known times unchanged', () => {
    const finishers = [
      { timeStr: '20:00', timeSec: 1200 },
      { timeStr: '21:00', timeSec: 1260 },
    ];
    const result = assignUnknownFinishTimes(finishers);
    expect(result[0].timeSec).toBe(1200);
    expect(result[1].timeSec).toBe(1260);
    expect(result[0].estimatedTime).toBeUndefined();
  });
});
