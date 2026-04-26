const {
  buildCompactPlanSummary,
  buildDifficultySummary,
  buildSentencePlanSummary,
} = require('../src/p-index-progression.user');

describe('p-index progression script', () => {
  test('buildCompactPlanSummary formats compact plan text', () => {
    const text = buildCompactPlanSummary([
      { eventName: 'A', additionalFinishes: 1 },
      { eventName: 'New event 1', additionalFinishes: 3 },
    ]);
    expect(text).toBe('+1 A, +3 New event 1');
  });

  test('buildSentencePlanSummary groups single-visit actions', () => {
    const text = buildSentencePlanSummary([
      { eventName: 'A', additionalFinishes: 1 },
      { eventName: 'B', additionalFinishes: 1 },
      { eventName: 'New event 1', additionalFinishes: 4 },
    ]);
    expect(text).toBe('Add A and B once, and add New event 1 4 times.');
  });

  test('buildDifficultySummary includes lookahead plan lines', () => {
    const progression = [
      {
        isJump: true,
        finishesSincePreviousIncrease: 1,
        previousPIndex: 0,
        pIndex: 1,
        nextPlan: {
          totalAdditionalFinishes: 2,
          actions: [{ eventName: 'A', additionalFinishes: 2 }],
        },
        lookaheadPlan: {
          totalAdditionalFinishes: 4,
          actions: [
            { eventName: 'A', additionalFinishes: 1 },
            { eventName: 'B', additionalFinishes: 3 },
          ],
        },
      },
    ];

    const summary = buildDifficultySummary(progression, 1);
    expect(summary).toEqual([
      'Current p-index: 1',
      'Finishes since previous increase: 1',
      'Longest gap: 1 finishes (between p-index 0 and 1)',
      'Minimum finishes to next p-index 2: 2 finishes. Add A 2 times.',
      'Then minimum finishes to p-index 3: 4 finishes. Add A once, and add B 3 times.',
    ]);
  });
});
