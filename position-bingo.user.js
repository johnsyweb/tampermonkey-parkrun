// ==UserScript==
// @name         parkrun Position Bingo Challenge
// @description  Tracks progress on the unofficial parkrun position bingo challenge (last two digits of position) with a 10x10 grid visualization and detailed event info.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/position-bingo.user.js
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
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/position-bingo.user.js
// @version      1.0.6
// ==/UserScript==

(function () {
  'use strict';

  const GRID_SIZE = 100;

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function extractPositionBingoData(table) {
    const completedPositions = {};
    const rows = Array.from(table.querySelectorAll('tr')).reverse(); // Reverse rows for chronological order
    let totalEvents = 0;

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) continue; // Ensure the row has enough columns

      const position = cells[3].textContent.trim(); // 'pos' column is the 4th column (index 3)
      const lastTwoDigits = parseInt(position.slice(-2), 10); // Extract last two digits
      const eventName = cells[0].textContent.trim();
      const date = cells[1].textContent.trim();

      if (!isNaN(lastTwoDigits) && lastTwoDigits >= 0 && lastTwoDigits < GRID_SIZE) {
        if (!completedPositions[lastTwoDigits]) {
          completedPositions[lastTwoDigits] = [];
        }
        completedPositions[lastTwoDigits].push({ eventName, date, position });

        // Stop processing if all 100 positions are attained
        if (Object.keys(completedPositions).length === GRID_SIZE) {
          break;
        }
      }

      totalEvents++;
    }

    return {
      completedPositions,
      remainingPositions: Array.from({ length: GRID_SIZE }, (_, i) => i).filter(
        (pos) => !completedPositions[pos]
      ),
      completedCount: Object.keys(completedPositions).length,
      totalEvents,
    };
  }

  function createPositionBingoContainer(data) {
    const container = document.createElement('div');
    container.className = 'parkrun-position-bingo-container';
    container.style.margin = '20px auto'; // Center the container and add space below
    container.style.padding = '10px'; // Add padding inside the container
    container.style.backgroundColor = '#2b223d';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.color = '#e0e0e0';
    container.style.textAlign = 'center';

    const heading = document.createElement('h3');
    heading.textContent = 'Position Bingo Challenge';
    heading.style.marginBottom = '10px';
    heading.style.color = '#FFA300';
    container.appendChild(heading);

    const stats = document.createElement('div');
    stats.innerHTML =
      '<div style="font-size: 1.2em; margin-bottom: 10px;">' +
      '<strong>' +
      data.completedCount +
      ' of ' +
      GRID_SIZE +
      '</strong> positions completed</div>' +
      '<div>After ' +
      data.totalEvents +
      ' parkruns</div>';
    container.appendChild(stats);

    const COLUMNS = 10;
    const ROWS = Math.ceil(GRID_SIZE / COLUMNS);
    const BOX_SIZE = 100; // Size of each box in pixels
    const GAP_SIZE = 5; // Gap between boxes in pixels

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${COLUMNS}, ${BOX_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${ROWS}, ${BOX_SIZE}px)`;
    grid.style.gap = `${GAP_SIZE}px`;
    grid.style.margin = '0 auto';

    for (let i = 0; i < GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.style.boxSizing = 'border-box'; // Include borders in size calculations
      cell.style.border = '1px solid #666';
      cell.style.borderRadius = '4px';
      cell.style.backgroundColor = data.completedPositions[i] ? '#FFA300' : '#008080'; // Orange for completed, teal for unattained
      cell.style.color = '#fff';

      cell.style.textAlign = 'left';
      cell.style.padding = '2px';
      cell.style.fontWeight = 'bold';
      cell.style.fontSize = '0.9em';
      cell.style.cursor = data.completedPositions[i] ? 'pointer' : 'default';
      cell.style.aspectRatio = '1'; // Ensure cells are square

      const positionText = document.createElement('div');
      positionText.textContent = i.toString().padStart(2, '0'); // Display as two-digit number
      positionText.style.fontSize = '1.2em';
      positionText.style.marginBottom = '5px';
      cell.appendChild(positionText);

      if (data.completedPositions[i]) {
        const eventDetails = document.createElement('div');
        eventDetails.innerHTML =
          '<div style="font-size: 0.8em; text-align: center;">' +
          data.completedPositions[i][0].eventName +
          '<br>' +
          '<span style="font-size: 0.7em;">' +
          data.completedPositions[i][0].date +
          ' (' +
          data.completedPositions[i][0].position +
          ')</span>' +
          '</div>';
        cell.appendChild(eventDetails);

        // Add click handler for popup
        cell.addEventListener('click', () => {
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          overlay.style.zIndex = '999';
          overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
          });

          const popup = document.createElement('div');
          popup.style.position = 'fixed';
          popup.style.top = '50%';
          popup.style.left = '50%';
          popup.style.transform = 'translate(-50%, -50%)';
          popup.style.backgroundColor = '#2b223d';
          popup.style.color = '#fff';
          popup.style.padding = '20px';
          popup.style.borderRadius = '8px';
          popup.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
          popup.style.zIndex = '1000';
          popup.style.maxWidth = '90%';
          popup.style.maxHeight = '80%';
          popup.style.overflowY = 'auto';

          const popupHeading = document.createElement('h4');
          popupHeading.textContent = `Position ${i.toString().padStart(2, '0')}`;
          popupHeading.style.marginBottom = '10px';
          popupHeading.style.color = '#FFA300';
          popup.appendChild(popupHeading);

          data.completedPositions[i].forEach(({ eventName, date, position }) => {
            const entry = document.createElement('div');
            entry.style.marginBottom = '10px';
            entry.innerHTML =
              '<strong>' +
              eventName +
              '</strong><br>' +
              '<span style="font-size: 0.9em;">' +
              date +
              ' (' +
              position +
              ')</span>';
            popup.appendChild(entry);
          });

          overlay.appendChild(popup);
          document.body.appendChild(overlay);
        });
      }

      grid.appendChild(cell);
    }

    container.appendChild(grid);
    addDownloadButton(container);

    return container;
  }

  function addDownloadButton(container) {
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '15px';
    btnContainer.id = 'position-bingo-download-btn-container';

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

      // Use html2canvas to capture the container
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
        link.download = `position-bingo-${parkrunnerId}-${timestamp}.png`;
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

  function initPositionBingoChallenge() {
    const resultsTable = findResultsTable();
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    const data = extractPositionBingoData(resultsTable);
    const positionBingoContainer = createPositionBingoContainer(data);
    insertAfterTitle(positionBingoContainer);
  }

  initPositionBingoChallenge();
})();
