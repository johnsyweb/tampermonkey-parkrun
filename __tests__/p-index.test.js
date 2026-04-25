const {
  applyPlanToEventCounts,
  buildDifficultySummary,
  buildCompactPlanSummary,
  calculatePIndex,
  calculatePIndexProgression,
  calculateMinimumFinishesPlan,
  extractFinishTimeline,
  groupFinishesByEvent,
} = require('../src/p-index.user');

describe('calculatePIndex', () => {
  test('calculates p-index for sample event details', () => {
    const sampleEventDetails = [
      [
        'Aurora',
        [
          { date: '07/01/2023', eventNumber: '1' },
          { date: '14/01/2023', eventNumber: '2' },
          { date: '21/01/2023', eventNumber: '3' },
        ],
      ],
      [
        'Brimbank',
        [
          { date: '28/01/2023', eventNumber: '1' },
          { date: '04/02/2023', eventNumber: '2' },
        ],
      ],
      ['Coburg', [{ date: '11/02/2023', eventNumber: '1' }]],
    ];

    const { pIndex, contributingEvents } = calculatePIndex(sampleEventDetails);

    expect(pIndex).toBe(2);
    expect(contributingEvents).toEqual(
      expect.arrayContaining([
        'Aurora (3): 07/01/2023 (#1) - 14/01/2023 (#2)',
        'Brimbank (2): 28/01/2023 (#1) - 04/02/2023 (#2)',
      ])
    );
  });

  test('returns p-index 0 for empty event details', () => {
    const result = calculatePIndex([]);

    expect(result.pIndex).toBe(0);
    expect(result.contributingEvents).toHaveLength(0);
  });

  test('handles single event with multiple visits', () => {
    const singleEventDetails = [
      [
        'Aurora',
        [
          { date: '07/01/2023', eventNumber: '1' },
          { date: '14/01/2023', eventNumber: '2' },
          { date: '21/01/2023', eventNumber: '3' },
        ],
      ],
    ];

    const { pIndex, contributingEvents } = calculatePIndex(singleEventDetails);

    expect(pIndex).toBe(1);
    expect(contributingEvents).toEqual(
      expect.arrayContaining(['Aurora (3): 07/01/2023 (#1) - 07/01/2023 (#1)'])
    );
  });

  test('sorts contributing events by date', () => {
    const eventDetails = [
      [
        'Aurora',
        [
          { date: '21/02/2023', eventNumber: '76' },
          { date: '28/02/2023', eventNumber: '77' },
        ],
      ],
      [
        'Brimbank',
        [
          { date: '01/01/2023', eventNumber: '1' },
          { date: '08/01/2023', eventNumber: '2' },
        ],
      ],
    ];

    const { pIndex, contributingEvents } = calculatePIndex(eventDetails);

    expect(pIndex).toBe(2);
    expect(contributingEvents).toEqual(
      expect.arrayContaining([
        'Brimbank (2): 01/01/2023 (#1) - 08/01/2023 (#2)',
        'Aurora (2): 21/02/2023 (#76) - 28/02/2023 (#77)',
      ])
    );
  });
});

describe('progression analytics', () => {
  test('extractFinishTimeline sorts finishes by date ascending', () => {
    document.body.innerHTML = `
      <table id="results">
        <tbody>
          <tr>
            <td><a>Alpha</a></td>
            <td>21/01/2023</td>
            <td>3</td>
          </tr>
          <tr>
            <td><a>Bravo</a></td>
            <td>07/01/2023</td>
            <td>1</td>
          </tr>
          <tr>
            <td><a>Alpha</a></td>
            <td>14/01/2023</td>
            <td>2</td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.querySelector('#results');
    const timeline = extractFinishTimeline(table);

    expect(timeline.map((finish) => finish.date)).toEqual([
      '07/01/2023',
      '14/01/2023',
      '21/01/2023',
    ]);
  });

  test('calculatePIndexProgression marks increase points with gap sizes', () => {
    const finishTimeline = [
      { eventName: 'A', date: '07/01/2023', eventNumber: '1' },
      { eventName: 'B', date: '14/01/2023', eventNumber: '1' },
      { eventName: 'A', date: '21/01/2023', eventNumber: '2' },
      { eventName: 'B', date: '28/01/2023', eventNumber: '2' },
      { eventName: 'A', date: '04/02/2023', eventNumber: '3' },
    ];

    const progression = calculatePIndexProgression(finishTimeline);

    expect(progression.map((point) => point.pIndex)).toEqual([1, 1, 1, 2, 2]);
    expect(progression.filter((point) => point.isJump).map((point) => point.finishes)).toEqual([
      1, 4,
    ]);
    expect(
      progression
        .filter((point) => point.isJump)
        .map((point) => point.finishesSincePreviousIncrease)
    ).toEqual([1, 3]);
  });

  test('buildDifficultySummary returns extended difficulty metrics', () => {
    const finishTimeline = [
      { eventName: 'A', date: '07/01/2023', eventNumber: '1' },
      { eventName: 'B', date: '14/01/2023', eventNumber: '1' },
      { eventName: 'A', date: '21/01/2023', eventNumber: '2' },
      { eventName: 'B', date: '28/01/2023', eventNumber: '2' },
      { eventName: 'A', date: '04/02/2023', eventNumber: '3' },
    ];
    const progression = calculatePIndexProgression(finishTimeline);
    const grouped = groupFinishesByEvent(finishTimeline);
    const pIndex = calculatePIndex(grouped).pIndex;

    const summary = buildDifficultySummary(progression, pIndex);

    expect(summary).toEqual([
      'Current p-index: 2',
      'Finishes since previous increase: 1',
      'Longest gap: 3 finishes (between p-index 1 and 2)',
      'Minimum finishes to next p-index 3: 4 finishes. Add B once, and add New event 1 3 times.',
      'Then minimum finishes to p-index 4: 7 finishes. Add A, B, and New event 1 once, and add New event 2 4 times.',
    ]);
  });

  test('calculateMinimumFinishesPlan finds minimum additional finishes', () => {
    const eventCounts = [
      { eventName: 'A', count: 4 },
      { eventName: 'B', count: 2 },
      { eventName: 'C', count: 1 },
    ];
    const plan = calculateMinimumFinishesPlan(eventCounts, 3);

    expect(plan.totalAdditionalFinishes).toBe(3);
    expect(plan.actions).toEqual([
      { eventName: 'B', additionalFinishes: 1, isNewEvent: false },
      { eventName: 'C', additionalFinishes: 2, isNewEvent: false },
    ]);
  });

  test('applyPlanToEventCounts updates counts for existing and new events', () => {
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

  test('buildCompactPlanSummary formats compact tooltip text', () => {
    const text = buildCompactPlanSummary([
      { eventName: 'B', additionalFinishes: 1, isNewEvent: false },
      { eventName: 'New event 1', additionalFinishes: 3, isNewEvent: true },
    ]);

    expect(text).toBe('+1 B, +3 New event 1');
  });

  test('calculateMinimumFinishesPlan orders actions by oldest visit first', () => {
    const plan = calculateMinimumFinishesPlan(
      [
        { eventName: 'Old Event', count: 2, lastVisitIndex: 2 },
        { eventName: 'Recent Event', count: 2, lastVisitIndex: 9 },
        { eventName: 'Anchor', count: 4, lastVisitIndex: 10 },
      ],
      3
    );

    expect(plan.actions).toEqual([
      { eventName: 'Old Event', additionalFinishes: 1, isNewEvent: false },
      { eventName: 'Recent Event', additionalFinishes: 1, isNewEvent: false },
    ]);
  });
});
