const {
  applyPlanToEventCounts,
  buildDifficultyMetrics,
  buildEventStats,
  calculateMinimumFinishesPlan,
  calculatePIndex,
  calculatePIndexProgression,
  groupFinishesByEvent,
  parseDateDdMmYyyy,
} = require('../lib/p-index-core');

describe('p-index core', () => {
  test('parseDateDdMmYyyy parses dd/mm/yyyy', () => {
    const parsed = parseDateDdMmYyyy('07/01/2023');
    expect(parsed.getFullYear()).toBe(2023);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(7);
  });

  test('groupFinishesByEvent groups by event with count ordering', () => {
    const grouped = groupFinishesByEvent([
      { eventName: 'B', date: '01/01/2023', eventNumber: '1' },
      { eventName: 'A', date: '02/01/2023', eventNumber: '1' },
      { eventName: 'A', date: '03/01/2023', eventNumber: '2' },
    ]);

    expect(grouped[0][0]).toBe('A');
    expect(grouped[0][1]).toHaveLength(2);
    expect(grouped[1][0]).toBe('B');
  });

  test('calculatePIndex computes p-index value', () => {
    const grouped = [
      ['A', [{}, {}, {}]],
      ['B', [{}, {}]],
      ['C', [{}]],
    ];
    expect(calculatePIndex(grouped)).toBe(2);
  });

  test('buildEventStats tracks count and last visit index', () => {
    const stats = buildEventStats([{ eventName: 'A' }, { eventName: 'B' }, { eventName: 'A' }]);

    expect(stats).toEqual(
      expect.arrayContaining([
        { eventName: 'A', count: 2, lastVisitIndex: 2 },
        { eventName: 'B', count: 1, lastVisitIndex: 1 },
      ])
    );
  });

  test('calculateMinimumFinishesPlan finds minimum finishes', () => {
    const plan = calculateMinimumFinishesPlan(
      [
        { eventName: 'A', count: 4, lastVisitIndex: 7 },
        { eventName: 'B', count: 2, lastVisitIndex: 6 },
        { eventName: 'C', count: 1, lastVisitIndex: 2 },
      ],
      3
    );

    expect(plan.totalAdditionalFinishes).toBe(3);
    expect(plan.actions).toEqual([
      { eventName: 'C', additionalFinishes: 2, isNewEvent: false },
      { eventName: 'B', additionalFinishes: 1, isNewEvent: false },
    ]);
  });

  test('applyPlanToEventCounts updates counts and recency', () => {
    const updated = applyPlanToEventCounts(
      [
        { eventName: 'A', count: 4, lastVisitIndex: 5 },
        { eventName: 'B', count: 2, lastVisitIndex: 6 },
      ],
      [
        { eventName: 'B', additionalFinishes: 1, isNewEvent: false },
        { eventName: 'New event 1', additionalFinishes: 3, isNewEvent: true },
      ]
    );

    expect(updated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventName: 'A', count: 4 }),
        expect.objectContaining({ eventName: 'B', count: 3 }),
        expect.objectContaining({ eventName: 'New event 1', count: 3 }),
      ])
    );
  });

  test('calculatePIndexProgression includes planning fields', () => {
    const progression = calculatePIndexProgression([
      { eventName: 'A', date: '07/01/2023', eventNumber: '1' },
      { eventName: 'B', date: '14/01/2023', eventNumber: '1' },
      { eventName: 'A', date: '21/01/2023', eventNumber: '2' },
      { eventName: 'B', date: '28/01/2023', eventNumber: '2' },
    ]);

    expect(progression).toHaveLength(4);
    expect(progression[3].pIndex).toBe(2);
    expect(progression[3].nextPlan).toBeDefined();
    expect(progression[3].lookaheadPlan).toBeDefined();
  });

  test('buildDifficultyMetrics returns numeric metrics and plans', () => {
    const progression = calculatePIndexProgression([
      { eventName: 'A', date: '07/01/2023', eventNumber: '1' },
      { eventName: 'B', date: '14/01/2023', eventNumber: '1' },
      { eventName: 'A', date: '21/01/2023', eventNumber: '2' },
      { eventName: 'B', date: '28/01/2023', eventNumber: '2' },
    ]);
    const metrics = buildDifficultyMetrics(progression, 2);

    expect(metrics.nextTarget).toBe(3);
    expect(metrics.lookaheadTarget).toBe(4);
    expect(metrics.nextPlan.totalAdditionalFinishes).toBeGreaterThan(0);
  });
});
