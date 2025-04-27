// ==UserScript==
// @name         parkrun Alphabet Challenge
// @description  Tracks progress on the unofficial parkrun alphabet challenge (A-Z, excluding X) with a 5x5 grid visualization and download feature.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/alphabet-challenge.user.js
// @grant        none
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
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
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/alphabet-challenge.user.js
// @version      2025-04-22
// ==/UserScript==

(function () {
  'use strict';

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((letter) => letter !== 'X');

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function extractAlphabetData(table) {
    const completedLetters = {};
    const rows = Array.from(table.querySelectorAll('tr')).reverse(); // Reverse rows for chronological order
    let totalEvents = 0;
    let dateOfCompletion = null;

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 1) continue;

      const eventName = cells[0].textContent.trim();
      const date = cells[1].textContent.trim();
      const firstLetter = eventName.charAt(0).toUpperCase();

      totalEvents++;

      if (ALPHABET.includes(firstLetter) && !completedLetters[firstLetter]) {
        completedLetters[firstLetter] = { eventName, date };

        // Stop processing if all 25 letters are attained
        if (Object.keys(completedLetters).length === 25) {
          dateOfCompletion = date;
          break;
        }
      }
    }

    const completedCount = Object.keys(completedLetters).length;

    return {
      completedLetters,
      remainingLetters: ALPHABET.filter((letter) => !completedLetters[letter]),
      completedCount,
      dateOfCompletion,
      totalEvents,
    };
  }

  function createAlphabetContainer(data) {
    const container = document.createElement('div');
    container.className = 'parkrun-alphabet-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = '20px auto';
    container.style.padding = '20px';
    container.style.backgroundColor = '#2b223d';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.color = '#e0e0e0';
    container.style.textAlign = 'center';

    const heading = document.createElement('h3');
    heading.textContent = 'Alphabet Challenge';
    heading.style.marginBottom = '15px';
    heading.style.color = '#FFA300';
    container.appendChild(heading);

    const stats = document.createElement('div');
    stats.innerHTML =
      '<div style="font-size: 1.2em; margin-bottom: 10px;">' +
      '<strong>' + data.completedCount + ' of 25</strong> letters completed' +
      '</div>' +
      '<div>After ' + data.totalEvents + ' parkruns</div>' +
      (data.dateOfCompletion ? '<div>🎉 Challenge completed on: ' + data.dateOfCompletion + '</div>' : '');
    container.appendChild(stats);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.style.gap = '10px';
    grid.style.marginTop = '20px';

    ALPHABET.forEach((letter) => {
      const cell = document.createElement('div');
      cell.style.aspectRatio = '1'; // Maintain square aspect ratio
      cell.style.position = 'relative';
      cell.style.border = '1px solid #666';
      cell.style.borderRadius = '4px';
      cell.style.backgroundColor = data.completedLetters[letter] ? '#FFA300' : '#008080'; // Teal for unattained
      cell.style.color = '#fff';
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';
      cell.style.alignItems = 'flex-start'; // Align text to the top-left
      cell.style.justifyContent = 'flex-start';
      cell.style.padding = '10px';
      cell.style.fontWeight = 'bold';
      cell.style.fontSize = '1em';

      const letterText = document.createElement('div');
      letterText.textContent = letter;
      letterText.style.fontSize = '1.5em';
      letterText.style.marginBottom = '5px';
      cell.appendChild(letterText);

      if (data.completedLetters[letter]) {
        const eventDetails = document.createElement('div');
        eventDetails.innerHTML =
          '<div style="font-size: 0.8em; text-align: left;">' +
          data.completedLetters[letter].eventName + '<br>' +
          '<span style="font-size: 0.7em;">(' + data.completedLetters[letter].date + ')</span>' +
          '</div>';
        cell.appendChild(eventDetails);
      }

      grid.appendChild(cell);
    });

    container.appendChild(grid);

    // Add download button
    addDownloadButton(container);

    return container;
  }

  function addDownloadButton(container) {
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '15px';
    btnContainer.id = 'alphabet-download-btn-container';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = '8px 15px';
    downloadBtn.style.backgroundColor = '#FFA300';
    downloadBtn.style.color = '#2b223d';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';

    // Add hover effect
    downloadBtn.addEventListener('mouseover', function () {
      this.style.backgroundColor = '#e59200';
    });

    downloadBtn.addEventListener('mouseout', function () {
      this.style.backgroundColor = '#FFA300';
    });

    // Download handler
    downloadBtn.addEventListener('click', function () {
      // Hide the download button temporarily for the screenshot
      downloadBtn.style.display = 'none';

      // eslint-disable-next-line no-undef
      html2canvas(container, {
        backgroundColor: '#2b223d',
        scale: 2, // Higher resolution
        logging: false,
        allowTaint: true,
        useCORS: true,
      }).then((canvas) => {
        // Show the button again
        downloadBtn.style.display = 'block';

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        const pageUrl = window.location.pathname.split('/');
        const parkrunnerId = pageUrl[2] || 'parkrunner';
        link.download = `alphabet-challenge-${parkrunnerId}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    btnContainer.appendChild(downloadBtn);
    container.appendChild(btnContainer);
  }

  function insertAfterTitle(element) {
    const pageTitle = document.querySelector('h2');
    if (pageTitle && pageTitle.parentNode) {
      if (pageTitle.nextSibling) {
        pageTitle.parentNode.insertBefore(element, pageTitle.nextSibling);
      } else {
        pageTitle.parentNode.appendChild(element);
      }
    }
  }

  function initAlphabetChallenge() {
    const resultsTable = findResultsTable();
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    const data = extractAlphabetData(resultsTable);
    const alphabetContainer = createAlphabetContainer(data);
    insertAfterTitle(alphabetContainer);
  }

  // Run the script
  initAlphabetChallenge();
})();
