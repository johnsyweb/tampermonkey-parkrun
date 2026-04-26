// ==UserScript==
// @name         parkrun p-index display
// @description  The parkrun p-index is an unofficial statistic that measures the number of different parkrun events a person has completed a specific number of times. To achieve a p-index of 10, you must have completed at least 10 different parkrun events 10 times each. This script calculates the p-index for a parkrunner and displays it on their results page.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/p-index.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/parkrunner/*/all/
// @match        *://www.parkrun.co.at/parkrunner/*/all/
// @match        *://www.parkrun.co.nl/parkrunner/*/all/
// @match        *://www.parkrun.co.nz/parkrunner/*/all/
// @match        *://www.parkrun.co.za/parkrunner/*/all/
// @match        *://www.parkrun.com.au/parkrunner/*/all/
// @match        *://www.parkrun.com.de/parkrunner/*/all/
// @match        *://www.parkrun.dk/parkrunner/*/all/
// @match        *://www.parkrun.fi/parkrunner/*/all/
// @match        *://www.parkrun.fr/parkrunner/*/all/
// @match        *://www.parkrun.ie/parkrunner/*/all/
// @match        *://www.parkrun.it/parkrunner/*/all/
// @match        *://www.parkrun.jp/parkrunner/*/all/
// @match        *://www.parkrun.lt/parkrunner/*/all/
// @match        *://www.parkrun.my/parkrunner/*/all/
// @match        *://www.parkrun.no/parkrunner/*/all/
// @match        *://www.parkrun.org.uk/parkrunner/*/all/
// @match        *://www.parkrun.pl/parkrunner/*/all/
// @match        *://www.parkrun.se/parkrunner/*/all/
// @match        *://www.parkrun.sg/parkrunner/*/all/
// @match        *://www.parkrun.us/parkrunner/*/all/
// @namespace    http://tampermonkey.net/
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @screenshot-url       https://www.parkrun.org.uk/parkrunner/1179626/all/
// @screenshot-selector  #p-index-display
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/p-index.user.js
// @version      1.1.9
// ==/UserScript==

(function () {
  'use strict';

  const {
    calculatePIndex,
    groupFinishesByEvent,
    parseDateDdMmYyyy,
  } = require('../lib/p-index-core');

  function getResponsiveConfig() {
    const mobileConfig = {
      isMobile: true,
      spacing: { small: '10px' },
      container: {
        padding: '10px',
        marginTop: '10px',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: 'auto',
      },
      typography: { pIndex: '1.2em', listItem: '0.9em' },
      listItem: { marginBottom: '5px', textAlign: 'left' },
      button: { padding: '6px 12px', fontSize: '0.9em', marginTop: '10px' },
    };

    const desktopConfig = {
      isMobile: false,
      spacing: { small: '20px' },
      container: {
        padding: '20px',
        marginTop: '20px',
        width: 'auto',
        maxWidth: 'none',
        aspectRatio: '1',
      },
      typography: { pIndex: '1.5em', listItem: '1em' },
      listItem: { marginBottom: '8px', textAlign: 'center' },
      button: { padding: '8px 15px', fontSize: '1em', marginTop: '15px' },
    };

    return window.innerWidth < 768 ? mobileConfig : desktopConfig;
  }

  if (
    typeof module !== 'undefined' &&
    module.exports &&
    typeof globalThis !== 'undefined' &&
    globalThis.process &&
    globalThis.process.versions &&
    globalThis.process.versions.node
  ) {
    module.exports = {
      buildContributingEvents,
      extractFinishTimeline,
      findResultsTable,
    };
  } else {
    main();
  }

  function main() {
    const table = findResultsTable();
    if (!table) {
      console.error('Results table not found');
      return;
    }
    const finishTimeline = extractFinishTimeline(table);
    const groupedEvents = groupFinishesByEvent(finishTimeline);
    const pIndex = calculatePIndex(groupedEvents);
    const contributingEvents = buildContributingEvents(groupedEvents, pIndex);
    displayPIndex(pIndex, contributingEvents);
  }

  function displayPIndex(pIndex, contributingEvents) {
    const responsive = getResponsiveConfig();
    const h2Element = document.querySelector('h2');
    if (!h2Element) return;

    const pIndexElement = document.createElement('div');
    pIndexElement.style.fontSize = responsive.typography.pIndex;
    pIndexElement.style.fontWeight = 'bold';
    pIndexElement.style.marginTop = responsive.container.marginTop;
    pIndexElement.style.backgroundColor = '#2b223d';
    pIndexElement.style.color = '#ffa300';
    pIndexElement.style.padding = responsive.container.padding;
    pIndexElement.style.borderRadius = '5px';
    pIndexElement.style.display = 'flex';
    pIndexElement.style.flexDirection = 'column';
    pIndexElement.style.alignItems = 'center';
    pIndexElement.style.justifyContent = 'center';
    pIndexElement.style.width = responsive.container.width;
    pIndexElement.style.maxWidth = responsive.container.maxWidth;
    pIndexElement.style.marginLeft = 'auto';
    pIndexElement.style.marginRight = 'auto';
    pIndexElement.style.aspectRatio = responsive.container.aspectRatio;
    pIndexElement.setAttribute('id', 'p-index-display');

    const heading = document.createElement('div');
    heading.textContent = 'p-index: ' + pIndex;
    pIndexElement.appendChild(heading);

    const eventList = document.createElement('ul');
    eventList.style.listStyleType = 'none';
    eventList.style.padding = '0';
    eventList.style.marginTop = responsive.spacing.small;
    eventList.style.width = '100%';
    contributingEvents.forEach((event) => {
      const listItem = document.createElement('li');
      listItem.textContent = event;
      listItem.style.fontWeight = 'normal';
      listItem.style.fontSize = responsive.typography.listItem;
      listItem.style.marginBottom = responsive.listItem.marginBottom;
      listItem.style.textAlign = responsive.listItem.textAlign;
      listItem.style.wordBreak = 'break-word';
      eventList.appendChild(listItem);
    });
    pIndexElement.appendChild(eventList);

    addDownloadButton(pIndexElement);
    h2Element.parentNode.insertBefore(pIndexElement, h2Element.nextSibling);

    if (!responsive.isMobile) {
      setTimeout(() => {
        const rect = pIndexElement.getBoundingClientRect();
        const maxDimension = Math.max(rect.width, rect.height);
        pIndexElement.style.width = maxDimension + 'px';
        pIndexElement.style.height = maxDimension + 'px';
      }, 0);
    }
  }

  function addDownloadButton(container) {
    const responsive = getResponsiveConfig();
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = responsive.button.marginTop;
    btnContainer.id = 'p-index-download-btn-container';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = responsive.button.padding;
    downloadBtn.style.backgroundColor = '#ffa300';
    downloadBtn.style.color = '#2b223d';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.fontSize = responsive.button.fontSize;

    downloadBtn.addEventListener('mouseover', function () {
      this.style.backgroundColor = '#e59200';
    });
    downloadBtn.addEventListener('mouseout', function () {
      this.style.backgroundColor = '#ffa300';
    });
    downloadBtn.addEventListener('click', function () {
      downloadBtn.style.display = 'none';
      html2canvas(container, {
        backgroundColor: '#2b223d',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
      }).then((canvas) => {
        downloadBtn.style.display = 'block';
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        const pageUrl = window.location.pathname.split('/');
        const parkrunnerId = pageUrl[2] || 'parkrunner';
        link.download = `p-index-${parkrunnerId}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    btnContainer.appendChild(downloadBtn);
    container.appendChild(btnContainer);
  }

  function extractFinishTimeline(table) {
    const finishes = [];
    const rows = table.querySelectorAll('tbody > tr');
    rows.forEach((row) => {
      const eventName = row.querySelector('td:nth-child(1)').textContent.trim();
      const date = row.querySelector('td:nth-child(2)').textContent.trim();
      const eventNumber = row.querySelector('td:nth-child(3)').textContent.trim();
      finishes.push({ eventName, date, eventNumber });
    });
    return finishes.sort((a, b) => parseDateDdMmYyyy(a.date) - parseDateDdMmYyyy(b.date));
  }

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function buildContributingEvents(groupedEvents, pIndex) {
    return groupedEvents
      .slice(0, pIndex)
      .map(([eventName, events]) => {
        const first = events[0];
        const pIndexReached = events[pIndex - 1];
        return {
          eventName,
          eventCount: events.length,
          firstDate: first.date,
          firstEventNumber: first.eventNumber,
          pIndexDate: pIndexReached.date,
          pIndexEventNumber: pIndexReached.eventNumber,
          pIndexDateForSorting: parseDateDdMmYyyy(pIndexReached.date),
        };
      })
      .sort((a, b) => a.pIndexDateForSorting - b.pIndexDateForSorting)
      .map(
        (event) =>
          event.eventName +
          ' (' +
          event.eventCount +
          '): ' +
          event.firstDate +
          ' (#' +
          event.firstEventNumber +
          ') - ' +
          event.pIndexDate +
          ' (#' +
          event.pIndexEventNumber +
          ')'
      );
  }
})();
