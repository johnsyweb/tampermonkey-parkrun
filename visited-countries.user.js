// ==UserScript==
// @name         parkrun Countries Visited
// @description  Shows country flag emojis next to parkrunner name for all countries they have completed parkruns in
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/visited-countries.user.js
// @grant        none
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/parkrunner/*/all*
// @match        *://www.parkrun.co.at/parkrunner/*/all*
// @match        *://www.parkrun.co.nl/parkrunner/*/all*
// @match        *://www.parkrun.co.nz/parkrunner/*/all*
// @match        *://www.parkrun.co.za/parkrunner/*/all*
// @match        *://www.parkrun.com.au/parkrunner/*/all*
// @match        *://www.parkrun.com.de/parkrunner/*/all*
// @match        *://www.parkrun.dk/parkrunner/*/all*
// @match        *://www.parkrun.fi/parkrunner/*/all*
// @match        *://www.parkrun.fr/parkrunner/*/all*
// @match        *://www.parkrun.ie/parkrunner/*/all*
// @match        *://www.parkrun.it/parkrunner/*/all*
// @match        *://www.parkrun.jp/parkrunner/*/all*
// @match        *://www.parkrun.lt/parkrunner/*/all*
// @match        *://www.parkrun.my/parkrunner/*/all*
// @match        *://www.parkrun.no/parkrunner/*/all*
// @match        *://www.parkrun.org.uk/parkrunner/*/all*
// @match        *://www.parkrun.pl/parkrunner/*/all*
// @match        *://www.parkrun.se/parkrunner/*/all*
// @match        *://www.parkrun.sg/parkrunner/*/all*
// @match        *://www.parkrun.us/parkrunner/*/all*
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/visited-countries.user.js
// @version      1.0.7
// ==/UserScript==

(function () {
  'use strict';

  const COUNTRY_INFO = {
    at: { flag: '🇦🇹', name: 'Austria' },
    ru: { flag: '🇷🇺', name: 'Russia' },
    au: { flag: '🇦🇺', name: 'Australia' },
    ca: { flag: '🇨🇦', name: 'Canada' },
    com: { flag: '🇺🇸', name: 'United States' },
    de: { flag: '🇩🇪', name: 'Germany' },
    dk: { flag: '🇩🇰', name: 'Denmark' },
    fi: { flag: '🇫🇮', name: 'Finland' },
    fr: { flag: '🇫🇷', name: 'France' },
    ie: { flag: '🇮🇪', name: 'Ireland' },
    is: { flag: '🇮🇸', name: 'Iceland' },
    it: { flag: '🇮🇹', name: 'Italy' },
    jp: { flag: '🇯🇵', name: 'Japan' },
    lt: { flag: '🇱🇹', name: 'Lithuania' },
    my: { flag: '🇲🇾', name: 'Malaysia' },
    nl: { flag: '🇳🇱', name: 'Netherlands' },
    no: { flag: '🇳🇴', name: 'Norway' },
    nz: { flag: '🇳🇿', name: 'New Zealand' },
    pl: { flag: '🇵🇱', name: 'Poland' },
    se: { flag: '🇸🇪', name: 'Sweden' },
    sg: { flag: '🇸🇬', name: 'Singapore' },
    uk: { flag: '🇬🇧', name: 'United Kingdom' },
    us: { flag: '🇺🇸', name: 'United States ' },
    za: { flag: '🇿🇦', name: 'South Africa' },
  };

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function getCountryCodeFromUrl(url) {
    const parts = url.hostname.split('.');
    let countryCode = parts[parts.length - 1];

    if (countryCode === 'com' && parts[0].length === 2) {
      countryCode = parts[0];
    }

    return countryCode;
  }

  function addFlagsToEventNames(table) {
    const rows = table.querySelectorAll('tr');

    rows.forEach((row) => {
      const eventCell = row.querySelector('td a[href*="parkrun"]');
      if (!eventCell) return;

      const url = new URL(eventCell.href);
      const countryCode = getCountryCodeFromUrl(url);
      const info = COUNTRY_INFO[countryCode];

      if (info) {
        const flagSpan = document.createElement('span');
        flagSpan.textContent = ` ${info.flag}`;
        flagSpan.title = info.name;
        flagSpan.style.cursor = 'help';
        eventCell.appendChild(flagSpan);
      }
    });
  }

  function countCountriesVisited(table) {
    const countryCounts = new Map();
    const rows = table.querySelectorAll('tr');

    rows.forEach((row) => {
      const eventCell = row.querySelector('td a[href*="parkrun"]');
      if (!eventCell) return;

      const url = new URL(eventCell.href);
      const countryCode = getCountryCodeFromUrl(url);
      countryCounts.set(countryCode, (countryCounts.get(countryCode) || 0) + 1);
    });

    return Array.from(countryCounts.entries())
      .sort((a, b) => {
        const nameA = COUNTRY_INFO[a[0]]?.name || a[0];
        const nameB = COUNTRY_INFO[b[0]]?.name || b[0];
        return nameA.localeCompare(nameB);
      })
      .map(([code, count]) => {
        const info = COUNTRY_INFO[code];
        const symbol = info ? info.flag : code;
        const name = info ? info.name : code.toUpperCase();
        return { symbol, name, count };
      });
  }

  function updateParkrunnerTitle(countryData) {
    if (!countryData.length) {
      console.log('No countries visited');
      return;
    }

    const title = document.querySelector('h2');
    if (!title) {
      console.log('No title');
      return;
    }

    const flagsContainer = document.createElement('div');
    flagsContainer.style.marginLeft = '10px';
    flagsContainer.style.fontSize = '1.8em';
    flagsContainer.style.marginTop = '5px';
    flagsContainer.title = `${countryData.length} Countries visited, according to parkrun's domains. Political boundaries may not be accurate.`;

    const symbols = document.createElement('span');
    symbols.style.lineHeight = '1.5';
    symbols.style.display = 'inline-block';
    countryData.forEach(({ symbol, name, count }) => {
      const flagSpan = document.createElement('span');
      flagSpan.textContent = symbol;
      flagSpan.title = `${name} (${count})`;
      flagSpan.style.cursor = 'help';
      symbols.appendChild(flagSpan);
      symbols.appendChild(document.createTextNode(' '));
    });

    flagsContainer.appendChild(symbols);
    title.appendChild(flagsContainer);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getCountryCodeFromUrl };
  } else {
    const resultsTable = findResultsTable();
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    addFlagsToEventNames(resultsTable);
    const countryCounts = countCountriesVisited(resultsTable);
    updateParkrunnerTitle(countryCounts);
  }
})();
