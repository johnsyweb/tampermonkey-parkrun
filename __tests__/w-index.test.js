const { calculateWilsonIndex, calculateWilsonIndexOverTime, extractEventDetails, findResultsTable } = require('../w-index');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Wilson Index Calculations', () => {
  test('wilson index should be 0 for no events', () => {
    const events = [];
    const wilsonIndex = calculateWilsonIndex(events);
    expect(wilsonIndex).toBe(0);
  });

  test('should calculate Wilson Index correctly for single, launch event', () => {
    const events = [{ eventName: 'A', eventNumber: 1 }];
    const wilsonIndex = calculateWilsonIndex(events);
    expect(wilsonIndex).toBe(1);
  });

  test('should calculate Wilson Index correctly for single event higher than one', () => {
    const events = [{ eventName: 'A', eventNumber: 147 }];
    const wilsonIndex = calculateWilsonIndex(events);
    expect(wilsonIndex).toBe(0);
  });


  test('should calculate basic Wilson Index correctly', () => {
    const events = [
      { eventNumber: 1 },
      { eventNumber: 2 },
      { eventNumber: 3 },
      { eventNumber: 5 },
      { eventNumber: 6 },
      { eventNumber: 7 },
      { eventNumber: 10 }
    ];

    const wilsonIndex = calculateWilsonIndex(events);
    expect(wilsonIndex).toBe(3); // longest sequence is 1,2,3
  });

  test('should calculate Wilson Index over time correctly', () => {
    const events = [
      { eventName: 'A', eventDate: '04 Jan 2025', eventNumber: 5 },
      { eventName: 'B', eventDate: '11 Jan 2025', eventNumber: 3 },
      { eventName: 'C', eventDate: '18 Jan 2025', eventNumber: 2 },
      { eventName: 'D', eventDate: '25 Jan 2025', eventNumber: 1 },
      { eventName: 'E', eventDate: '01 Feb 2025', eventNumber: 2 },
    ];

    const indices = calculateWilsonIndexOverTime(events);
    expect(indices).toEqual([
      { parkruns: 1, event: 'A # 5 on 04 Jan 2025', wilsonIndex: 0 },
      { parkruns: 2, event: 'B # 3 on 11 Jan 2025', wilsonIndex: 0 },
      { parkruns: 3, event: 'C # 2 on 18 Jan 2025', wilsonIndex: 0 },
      { parkruns: 4, event: 'D # 1 on 25 Jan 2025', wilsonIndex: 3 },
      { parkruns: 5, event: 'E # 2 on 01 Feb 2025', wilsonIndex: 3 }
    ]);
  });
});

describe('extractEventDetails', () => {
  test('should extract event numbers from table', () => {

    const html = fs.readFileSync(path.join(__dirname, '../test-data/1001388.html'), 'utf8');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const table = findResultsTable(document);
    const result = extractEventDetails(table);

    expect(result.slice(0, 3)).toEqual([
      { eventName: 'Westerfolds', eventDate: '14/06/2014', eventNumber: 35 },
      { eventName: 'Westerfolds', eventDate: '21/06/2014', eventNumber: 36 },
      { eventName: 'Westerfolds', eventDate: '28/06/2014', eventNumber: 37 },
    ]);
  });
});
