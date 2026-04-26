const {
  buildContributingEvents,
  extractFinishTimeline,
  findResultsTable,
} = require('../src/p-index.user');

describe('p-index summary script', () => {
  test('findResultsTable returns final results table', () => {
    document.body.innerHTML = `
      <table id="results"><tbody><tr><td>first</td></tr></tbody></table>
      <table id="results"><tbody><tr><td>second</td></tr></tbody></table>
    `;
    const table = findResultsTable();
    expect(table.querySelector('td').textContent).toBe('second');
  });

  test('extractFinishTimeline sorts finishes ascending by date', () => {
    document.body.innerHTML = `
      <table id="results">
        <tbody>
          <tr><td>Aurora</td><td>21/01/2023</td><td>3</td></tr>
          <tr><td>Brimbank</td><td>07/01/2023</td><td>1</td></tr>
          <tr><td>Aurora</td><td>14/01/2023</td><td>2</td></tr>
        </tbody>
      </table>
    `;
    const timeline = extractFinishTimeline(document.querySelector('#results'));
    expect(timeline.map((f) => f.date)).toEqual(['07/01/2023', '14/01/2023', '21/01/2023']);
  });

  test('buildContributingEvents returns correctly ordered output', () => {
    const groupedEvents = [
      [
        'Aurora',
        [
          { date: '07/01/2023', eventNumber: '1' },
          { date: '14/01/2023', eventNumber: '2' },
        ],
      ],
      [
        'Brimbank',
        [
          { date: '01/01/2023', eventNumber: '1' },
          { date: '08/01/2023', eventNumber: '2' },
        ],
      ],
      ['Coburg', [{ date: '10/01/2023', eventNumber: '1' }]],
    ];

    const contributing = buildContributingEvents(groupedEvents, 2);
    expect(contributing).toEqual([
      'Brimbank (2): 01/01/2023 (#1) - 08/01/2023 (#2)',
      'Aurora (2): 07/01/2023 (#1) - 14/01/2023 (#2)',
    ]);
  });
});
