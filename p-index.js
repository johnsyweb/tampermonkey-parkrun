// ==UserScript==
// @name         parkrun p-index display
// @namespace    http://tampermonkey.net/
// @version      2024-12-22
// @description  Calculate the p-index for a parkrunner and display it on their results page.
// @author       @johnsyweb
// @match        https://www.parkrun.com.au/parkrunner/*/all/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @grant        none
// @tag          parkrun
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  let table = findResultsTable();
  if (!table) {
    console.error('Results table not found');
    return;
  }
  let eventDetails = extractEventDetails(table);

  let { pIndex, contributingEvents } = calculatePIndex(eventDetails);

  displayPIndex(pIndex, contributingEvents);

  function displayPIndex(pIndex, contributingEvents) {
    let h2Element = document.querySelector('h2');
    if (h2Element) {
      let pIndexElement = document.createElement('div');
      pIndexElement.textContent = `p-index: ${pIndex}`;
      pIndexElement.style.fontSize = '1.5em';
      pIndexElement.style.fontWeight = 'bold';
      pIndexElement.style.marginTop = '10px';
      pIndexElement.style.backgroundColor = '#2b223d';
      pIndexElement.style.color = '#ffa300';
      pIndexElement.style.padding = '10px';
      pIndexElement.style.borderRadius = '5px';
      pIndexElement.style.display = 'flex';
      pIndexElement.style.flexDirection = 'column';
      pIndexElement.style.alignItems = 'center';
      pIndexElement.style.justifyContent = 'center';
      pIndexElement.setAttribute('id', 'p-index-display');

      let eventList = document.createElement('ul');
      eventList.style.listStyleType = 'none';
      eventList.style.padding = '0';
      contributingEvents.forEach(event => {
        let listItem = document.createElement('li');
        listItem.textContent = event;
        listItem.style.fontWeight = 'normal';
        listItem.style.fontSize = '1em';
        eventList.appendChild(listItem);
      });
      pIndexElement.appendChild(eventList);

      h2Element.parentNode.insertBefore(pIndexElement, h2Element.nextSibling);

      setTimeout(() => {
        let rect = pIndexElement.getBoundingClientRect();
        let maxDimension = Math.max(rect.width, rect.height);
        pIndexElement.style.width = `${maxDimension}px`;
        pIndexElement.style.height = `${maxDimension}px`;
      }, 0);
    }
  }

  function extractEventDetails(table) {
    let eventDetails = [];
    let rows = table.querySelectorAll('tbody > tr');
    rows.forEach(row => {
      let eventName = row.querySelector('td:nth-child(1) > a').textContent.trim();
      let date = row.querySelector('td:nth-child(2)').textContent.trim();
      let eventNumber = row.querySelector('td:nth-child(3)').textContent.trim();
      eventDetails.unshift({ eventName, date, eventNumber });
    });

    // Group event details by event name
    const groupedEvents = eventDetails.reduce((acc, { eventName, date, eventNumber }) => {
      if (!acc[eventName]) {
        acc[eventName] = [];
      }
      acc[eventName].push({ date, eventNumber });
      return acc;
    }, {});

    // Convert groupedEvents to an array of entries and sort by the number of visits
    const sortedGroupedEvents = Object.entries(groupedEvents).sort((a, b) => b[1].length - a[1].length);

    return sortedGroupedEvents;
  }

  function findResultsTable() {
    let tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function calculatePIndex(eventDetails) {
    let filteredGroupedEvents = eventDetails.filter(([, events], index) => events.length > index);
    let pIndex = filteredGroupedEvents.length;

    function convertDate(dateStr) {
      return new Date(dateStr.split('/').reverse().join('-'));
    }

    let contributingEvents = filteredGroupedEvents
      .map(([eventName, events]) => {
        let first = events[0];
        let pIndexReached = events[pIndex - 1];
        return {
          eventName,
          eventCount: events.length,
          firstDate: first.date,
          firstEventNumber: first.eventNumber,
          pIndexDate: pIndexReached.date,
          pIndexEventNumber: pIndexReached.eventNumber,
          firstDateForSorting: convertDate(first.date),
          pIndexDateForSorting: convertDate(pIndexReached.date)
        };
      })
      .sort((a, b) => a.pIndexDateForSorting - b.pIndexDateForSorting)
      .slice(0, pIndex)
      .map(event => `${event.eventName} (${event.eventCount}): ${event.firstDate} (#${event.firstEventNumber}) - ${event.pIndexDate} (#${event.pIndexEventNumber})`);

    return { pIndex, contributingEvents };
  }
})();
