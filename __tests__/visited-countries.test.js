jest.spyOn(console, 'log').mockImplementation(() => {});
const { getCountryCodeFromUrl } = require('../visited-countries.user.js');

describe('visited-countries', () => {
  describe('getCountryCodeFromUrl', () => {
    const testCases = [
      {
        description: 'handles standard country TLD (Australia)',
        url: new URL('https://www.parkrun.com.au/albert/results/1/'),
        expected: 'au',
      },
      {
        description: 'handles UK org domain',
        url: new URL('https://www.parkrun.org.uk/bushy/results/1/'),
        expected: 'uk',
      },
      {
        description: 'handles .com with country subdomain (Russia)',
        url: new URL('https://ru.parkrun.com/gorkypark/results/1/'),
        expected: 'ru',
      },
      {
        description: 'handles regular .com as US',
        url: new URL('https://www.parkrun.com/results/1/'),
        expected: 'com',
      },
      {
        description: 'handles co.* domains (New Zealand)',
        url: new URL('https://www.parkrun.co.nz/results/1/'),
        expected: 'nz',
      },
      {
        description: 'handles direct country domains (Ireland)',
        url: new URL('https://www.parkrun.ie/results/1/'),
        expected: 'ie',
      },
    ];

    testCases.forEach(({ description, url, expected }) => {
      test(description, () => {
        expect(getCountryCodeFromUrl(url)).toBe(expected);
      });
    });
  });
});
