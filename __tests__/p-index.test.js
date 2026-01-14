const { calculatePIndex } = require('../src/p-index.user');

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
