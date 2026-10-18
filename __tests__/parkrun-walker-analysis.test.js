// __tests__/parkrun-walker-analysis.test.js

const {
  assignUnknownFinishTimes,
  computeWalkerThreshold,
  getMilestoneClub,
  MILESTONE_CLUB_THRESHOLDS,
  MILESTONE_CLUB_ORDER,
  milestoneColours,
} = require('../src/parkrun-walker-analysis.user');

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

  describe('computeWalkerThreshold', () => {
    it('returns 1200 seconds for junior event URLs', () => {
      const url =
        'https://www.parkrun.com.au/eynesburyheritagetrail-juniors/results/latestresults/';
      expect(computeWalkerThreshold(url)).toBe(20 * 60);
    });

    it('returns 3000 seconds for normal event URLs', () => {
      const url = 'https://www.parkrun.org.uk/some-event/results/latestresults/';
      expect(computeWalkerThreshold(url)).toBe(50 * 60);
    });

    it('returns default 3000 for non-string or empty input', () => {
      expect(computeWalkerThreshold(null)).toBe(50 * 60);
      expect(computeWalkerThreshold('')).toBe(50 * 60);
    });
  });
});

describe('getMilestoneClub', () => {
  it('uses the official 5k/volunteer club ladder including the 2026 additions', () => {
    expect(MILESTONE_CLUB_ORDER).toEqual([
      10, 25, 50, 100, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
    ]);
    expect(MILESTONE_CLUB_THRESHOLDS).toEqual([...MILESTONE_CLUB_ORDER].reverse());
  });

  it('returns the highest club reached for a finish or volunteer count', () => {
    expect(getMilestoneClub(199, 'parkrun')).toEqual({
      status: 'parkrun 100 Club',
      milestone: 100,
    });
    expect(getMilestoneClub(200, 'parkrun')).toEqual({
      status: 'parkrun 200 Club',
      milestone: 200,
    });
    expect(getMilestoneClub(249, 'Volunteer')).toEqual({
      status: 'Volunteer 200 Club',
      milestone: 200,
    });
    expect(getMilestoneClub(250, 'Volunteer')).toEqual({
      status: 'Volunteer 250 Club',
      milestone: 250,
    });
    expect(getMilestoneClub(900, 'parkrun')).toEqual({
      status: 'parkrun 900 Club',
      milestone: 900,
    });
  });

  it('returns null status below the lowest club', () => {
    expect(getMilestoneClub(9, 'parkrun')).toEqual({ status: null, milestone: 0 });
  });

  it('defines a chart colour for every club threshold', () => {
    for (const club of MILESTONE_CLUB_ORDER) {
      expect(milestoneColours[club]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
