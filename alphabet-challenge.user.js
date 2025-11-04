// ==UserScript==
// @name         parkrun Alphabet Challenge
// @description  Tracks progress on the unofficial parkrun alphabet challenge (A-Z, excluding X) with a 5x5 grid visualization and download feature.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/alphabet-challenge.user.js
// @grant        none
// @homepage     https://johnsy.com/tampermonkey-parkrun/
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
// @version      1.0.36
// ==/UserScript==

(function () {
  'use strict';

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((letter) => letter !== 'X');

  function getResponsiveConfig() {
    const mobileConfig = {
      isMobile: true,
      spacing: {
        small: '8px',
        medium: '10px',
        large: '10px',
      },
      container: {
        padding: '10px',
        marginTop: '10px',
      },
      typography: {
        heading: '1.1em',
        stats: '1em',
        statsSubtext: '0.9em',
      },
      grid: {
        gapSize: '5px',
        marginTop: '10px',
        cellPadding: '5px',
        letterFontSize: '1.2em',
        letterMarginBottom: '2px',
        eventFontSize: '0.7em',
        dateFontSize: '0.65em',
      },
      button: {
        padding: '6px 12px',
        fontSize: '0.9em',
        marginTop: '10px',
      },
      heading: {
        marginBottom: '10px',
      },
    };

    const desktopConfig = {
      isMobile: false,
      spacing: {
        small: '10px',
        medium: '15px',
        large: '20px',
      },
      container: {
        padding: '20px',
        marginTop: '20px',
      },
      typography: {
        heading: '1.3em',
        stats: '1.2em',
        statsSubtext: '1em',
      },
      grid: {
        gapSize: '10px',
        marginTop: '20px',
        cellPadding: '10px',
        letterFontSize: '1.5em',
        letterMarginBottom: '5px',
        eventFontSize: '0.8em',
        dateFontSize: '0.7em',
      },
      button: {
        padding: '8px 15px',
        fontSize: '1em',
        marginTop: '15px',
      },
      heading: {
        marginBottom: '15px',
      },
    };

    const isMobile = window.innerWidth < 768;
    return isMobile ? mobileConfig : desktopConfig;
  }

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
    const responsive = getResponsiveConfig();
    const container = document.createElement('div');
    container.className = 'parkrun-alphabet-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = `${responsive.container.marginTop} auto`;
    container.style.padding = responsive.container.padding;
    container.style.backgroundColor = '#2b223d';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.color = '#e0e0e0';
    container.style.textAlign = 'center';

    const heading = document.createElement('h3');
    heading.textContent = 'Alphabet Challenge';
    heading.style.marginBottom = responsive.heading.marginBottom;
    heading.style.color = '#FFA300';
    heading.style.fontSize = responsive.typography.heading;
    container.appendChild(heading);

    const stats = document.createElement('div');
    stats.innerHTML =
      `<div style="font-size: ${responsive.typography.stats}; margin-bottom: ${responsive.spacing.small};">` +
      '<strong>' +
      data.completedCount +
      ' of 25</strong> letters completed' +
      '</div>' +
      `<div style="font-size: ${responsive.typography.statsSubtext};">After ` +
      data.totalEvents +
      ' parkruns</div>' +
      (data.dateOfCompletion
        ? `<div style="font-size: ${responsive.typography.statsSubtext};">🎉 Challenge completed on: ${data.dateOfCompletion}</div>`
        : '');
    container.appendChild(stats);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.style.gap = responsive.grid.gapSize;
    grid.style.marginTop = responsive.grid.marginTop;

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
      cell.style.padding = responsive.grid.cellPadding;
      cell.style.fontWeight = 'bold';
      cell.style.fontSize = '1em';
      cell.style.cursor = data.completedLetters[letter] ? 'pointer' : 'default';

      const letterText = document.createElement('div');
      letterText.textContent = letter;
      letterText.style.fontSize = responsive.grid.letterFontSize;
      letterText.style.marginBottom = responsive.grid.letterMarginBottom;
      cell.appendChild(letterText);

      if (data.completedLetters[letter]) {
        const eventDetails = document.createElement('div');
        eventDetails.innerHTML =
          `<div style="font-size: ${responsive.grid.eventFontSize}; text-align: left;">` +
          data.completedLetters[letter].eventName +
          '<br>' +
          `<span style="font-size: ${responsive.grid.dateFontSize};">(` +
          data.completedLetters[letter].date +
          ')</span>' +
          '</div>';
        // Hide event details on mobile to prevent text overflow
        if (responsive.isMobile) {
          eventDetails.style.display = 'none';
        }
        cell.appendChild(eventDetails);

        // Add click handler for popup
        cell.addEventListener('click', () => {
          const popupResponsive = getResponsiveConfig();
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
          const popupPadding = popupResponsive.isMobile ? '15px' : '20px';
          popup.style.padding = popupPadding;
          popup.style.borderRadius = '8px';
          popup.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
          popup.style.zIndex = '1000';
          popup.style.maxWidth = popupResponsive.isMobile ? '95%' : '90%';
          popup.style.maxHeight = popupResponsive.isMobile ? '85%' : '80%';
          popup.style.overflowY = 'auto';
          popup.style.fontSize = popupResponsive.isMobile ? '0.9em' : '1em';

          const popupHeading = document.createElement('h4');
          popupHeading.textContent = `Letter ${letter}`;
          popupHeading.style.marginBottom = '10px';
          popupHeading.style.color = '#FFA300';
          popup.appendChild(popupHeading);

          const entry = document.createElement('div');
          entry.style.marginBottom = '10px';
          entry.innerHTML =
            '<strong>' +
            data.completedLetters[letter].eventName +
            '</strong><br>' +
            '<span style="font-size: 0.9em;">' +
            data.completedLetters[letter].date +
            '</span>';
          popup.appendChild(entry);

          overlay.appendChild(popup);
          document.body.appendChild(overlay);
        });
      }

      grid.appendChild(cell);
    });

    container.appendChild(grid);

    // Add download button
    addDownloadButton(container);

    return container;
  }

  function addDownloadButton(container) {
    const responsive = getResponsiveConfig();
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = responsive.button.marginTop;
    btnContainer.id = 'alphabet-download-btn-container';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = responsive.button.padding;
    downloadBtn.style.backgroundColor = '#FFA300';
    downloadBtn.style.color = '#2b223d';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.fontSize = responsive.button.fontSize;

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
