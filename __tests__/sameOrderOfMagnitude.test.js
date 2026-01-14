const { sameOrderOfMagnitude } = require('../src/parkrun-charts.user');

describe('sameOrderOfMagnitude', () => {
  test('returns true for numbers in the same order of magnitude', () => {
    expect(sameOrderOfMagnitude(100, 200)).toBe(true);
    expect(sameOrderOfMagnitude(1, 9)).toBe(true);
    expect(sameOrderOfMagnitude(1000, 1500)).toBe(true);
  });

  test('returns false for numbers in different orders of magnitude', () => {
    expect(sameOrderOfMagnitude(10, 1000)).toBe(false);
    expect(sameOrderOfMagnitude(173, 19)).toBe(false);
    expect(sameOrderOfMagnitude(1, 100)).toBe(false);
  });

  test('returns false if either number is zero', () => {
    expect(sameOrderOfMagnitude(0, 100)).toBe(false);
    expect(sameOrderOfMagnitude(100, 0)).toBe(false);
    expect(sameOrderOfMagnitude(0, 0)).toBe(false);
  });
});
